"""FastAPI interface for the ContextDB Oracle schema (python-oracledb Thin mode)."""
import os
from contextlib import contextmanager
from typing import Literal
import oracledb
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

DB_USER=os.getenv('ORACLE_USER','DBMS'); DB_PASSWORD=os.getenv('ORACLE_PASSWORD','daemon'); DB_DSN=os.getenv('ORACLE_DSN','localhost:1521/FREEPDB1')
app=FastAPI(title='ContextDB API',version='1.0.0')
@contextmanager
def connection():
    conn=oracledb.connect(user=DB_USER,password=DB_PASSWORD,dsn=DB_DSN); 
    try: yield conn
    finally: conn.close()
def rows(cursor):
    names=[d[0].lower() for d in cursor.description]
    # Oracle returns CLOBs as LOB handles in Thin mode; materialize them for JSON.
    return [dict(zip(names,[value.read() if hasattr(value,'read') else value for value in row])) for row in cursor]
class MemoryCreate(BaseModel):
    project_id:int; title:str=Field(max_length=200); content:str; memory_type:Literal['REQUIREMENT','DECISION','CONSTRAINT','BUG','SOLUTION','FINDING','RULE']; importance:int=Field(default=3,ge=1,le=5); session_id:int|None=None; task_id:int|None=None; tag_ids:list[int]=[]
class TaskStatus(BaseModel): status:Literal['OPEN','IN_PROGRESS','COMPLETED','BLOCKED']
@app.get('/api/health')
def health():
    with connection() as conn:
        cur=conn.cursor(); cur.execute("SELECT table_name, num_rows FROM user_tables WHERE table_name IN ('USERS','AGENTS','PROJECTS','SESSIONS','TASKS','MEMORIES','TAGS','MEMORY_TAGS')")
        estimated={r[0].lower():r[1] for r in cur}; counts={}
        for table in ('users','agents','projects','sessions','tasks','memories','tags','memory_tags'):
            cur.execute(f'SELECT COUNT(*) FROM {table}'); counts[table]=cur.fetchone()[0]
    return {'status':'ok','oracle_dsn':DB_DSN,'table_counts':counts,'statistics_hint':estimated}
@app.get('/api/projects')
def projects():
    with connection() as conn:
        c=conn.cursor(); c.execute('''SELECT p.project_id,p.project_name,p.status,COUNT(DISTINCT t.task_id) task_count,COUNT(DISTINCT m.memory_id) memory_count FROM projects p LEFT JOIN tasks t ON t.project_id=p.project_id LEFT JOIN memories m ON m.project_id=p.project_id GROUP BY p.project_id,p.project_name,p.status ORDER BY p.project_id'''); return rows(c)
@app.get('/api/memories')
def memories(project_id:int|None=None,memory_type:str|None=None,min_importance:int|None=Query(None,ge=1,le=5),keyword:str|None=None):
    sql='SELECT memory_id,project_id,session_id,task_id,title,content,memory_type,importance,created_at,updated_at FROM memories WHERE 1=1'; binds={}
    for col,val,key in [('project_id',project_id,'project_id'),('memory_type',memory_type,'memory_type'),('importance',min_importance,'min_importance')]:
        if val is not None: sql+=f' AND {col} {">=" if col=="importance" else "="} :{key}'; binds[key]=val
    if keyword: sql+=' AND (LOWER(title) LIKE :keyword OR DBMS_LOB.INSTR(LOWER(content),:term)>0)'; binds.update(keyword=f'%{keyword.lower()}%',term=keyword.lower())
    sql+=' ORDER BY importance DESC, created_at DESC'
    with connection() as conn: c=conn.cursor(); c.execute(sql,binds); return rows(c)
@app.post('/api/memories',status_code=201)
def create_memory(item:MemoryCreate):
    with connection() as conn:
        c=conn.cursor(); mid=c.var(oracledb.NUMBER); c.execute('''INSERT INTO memories(project_id,session_id,task_id,title,content,memory_type,importance) VALUES(:project_id,:session_id,:task_id,:title,:content,:memory_type,:importance) RETURNING memory_id INTO :mid''',{**item.model_dump(exclude={'tag_ids'}),'mid':mid}); memory_id=int(mid.getvalue()[0]);
        for tag_id in item.tag_ids: c.execute('INSERT INTO memory_tags(memory_id,tag_id) VALUES(:memory_id,:tag_id)',memory_id=memory_id,tag_id=tag_id)
        conn.commit(); return {'memory_id':memory_id,'tag_ids':item.tag_ids}
@app.put('/api/tasks/{task_id}/status')
def update_task(task_id:int,item:TaskStatus):
    with connection() as conn:
        c=conn.cursor(); c.execute("UPDATE tasks SET status=:status,completed_at=CASE WHEN :status='COMPLETED' THEN CURRENT_TIMESTAMP ELSE completed_at END WHERE task_id=:task_id",status=item.status,task_id=task_id)
        if not c.rowcount: raise HTTPException(404,'Task not found')
        conn.commit(); return {'task_id':task_id,'status':item.status}
@app.delete('/api/memories/{memory_id}')
def delete_memory(memory_id:int):
    with connection() as conn:
        c=conn.cursor(); c.execute('DELETE FROM memories WHERE memory_id=:id',id=memory_id)
        if not c.rowcount: raise HTTPException(404,'Memory not found')
        conn.commit(); return {'deleted_memory_id':memory_id}
@app.get('/api/context-builder/{project_id}')
def context_builder(project_id:int):
    with connection() as conn:
        c=conn.cursor(); c.execute('''SELECT m.memory_id,m.title,m.content,m.memory_type,m.importance,NVL(tc.tag_count,0) tag_count,(m.importance*10+NVL(tc.tag_count,0)*5) relevance_score FROM memories m LEFT JOIN (SELECT memory_id,COUNT(*) tag_count FROM memory_tags GROUP BY memory_id) tc ON tc.memory_id=m.memory_id WHERE m.project_id=:project_id ORDER BY relevance_score DESC,m.memory_id FETCH FIRST 5 ROWS ONLY''',project_id=project_id); result=rows(c)
    if not result: raise HTTPException(404,'Project has no memories')
    prompt='Project context:\n'+'\n'.join(f"- [{m['memory_type']}, importance {m['importance']}] {m['title']}: {m['content']}" for m in result)
    return {'project_id':project_id,'memories':result,'llm_context_prompt':prompt}

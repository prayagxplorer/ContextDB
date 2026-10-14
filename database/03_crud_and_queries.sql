SET PAGESIZE 100
SET LINESIZE 200
SET FEEDBACK ON
SET LONG 10000
PROMPT === PART A: CRUD DEMONSTRATION ===
PROMPT INSERT - before and after memory creation
SELECT COUNT(*) AS memories_before FROM memories;
INSERT INTO memories(memory_id,project_id,session_id,task_id,title,content,memory_type,importance) VALUES(10001,1,11,12,'CRUD demo memory','This inserted memory proves application knowledge can be persisted.','FINDING',4);
INSERT INTO memory_tags(memory_id,tag_id) VALUES(10001,8);
SELECT memory_id,title,importance FROM memories WHERE title='CRUD demo memory';
PROMPT UPDATE - task and memory before/after
SELECT task_id,status,completed_at FROM tasks WHERE task_id=12;
UPDATE tasks SET status='COMPLETED',completed_at=CURRENT_TIMESTAMP WHERE task_id=12;
UPDATE memories SET importance=5,updated_at=CURRENT_TIMESTAMP WHERE memory_id=10001;
SELECT task_id,status,completed_at FROM tasks WHERE task_id=12;
SELECT memory_id,title,importance FROM memories WHERE title='CRUD demo memory';
PROMPT DELETE - cascade integrity demonstration
INSERT INTO tags(tag_id,tag_name) VALUES(10001,'temporary-crud-tag');
INSERT INTO memories(memory_id,project_id,title,content,memory_type,importance) VALUES(10002,1,'Temporary CRUD memory','This row is deleted with its mapping.','FINDING',1);
INSERT INTO memory_tags VALUES(10002,10001);
SELECT COUNT(*) AS temp_mappings_before FROM memory_tags WHERE tag_id=10001;
DELETE FROM memories WHERE title='Temporary CRUD memory';
SELECT COUNT(*) AS temp_mappings_after FROM memory_tags WHERE tag_id=10001;
DELETE FROM tags WHERE tag_name='temporary-crud-tag';
COMMIT;
PROMPT === PART B: FIFTEEN MEANINGFUL QUERIES ===
PROMPT Q1 High importance decisions and constraints for ContextDB
SELECT title,memory_type,importance,created_at FROM memories WHERE project_id=1 AND memory_type IN ('DECISION','CONSTRAINT') AND importance>=4 ORDER BY importance DESC,created_at DESC;
PROMPT Q2 Open/in-progress high-priority tasks
SELECT task_id,title,priority,status FROM tasks WHERE status IN ('OPEN','IN_PROGRESS') AND priority IN ('HIGH','CRITICAL') ORDER BY priority DESC;
PROMPT Q3 Keyword search across title and CLOB content
SELECT memory_id,title,memory_type FROM memories WHERE LOWER(title) LIKE '%auth%' OR DBMS_LOB.INSTR(LOWER(content),'auth')>0;
PROMPT Q4 Sessions with user agent and project
SELECT s.session_id,u.name,a.agent_name,p.project_name,s.status FROM users u JOIN sessions s ON s.user_id=u.user_id JOIN agents a ON a.agent_id=s.agent_id JOIN projects p ON p.project_id=s.project_id ORDER BY s.session_id;
PROMPT Q5 Memories and tags
SELECT m.memory_id,m.title,t.tag_name FROM memories m JOIN memory_tags mt ON mt.memory_id=m.memory_id JOIN tags t ON t.tag_id=mt.tag_id ORDER BY m.memory_id,t.tag_name;
PROMPT Q6 Tasks and produced architectural or bug memories
SELECT p.project_name,ta.title,m.title,m.memory_type FROM projects p JOIN tasks ta ON ta.project_id=p.project_id JOIN memories m ON m.task_id=ta.task_id WHERE m.memory_type IN ('DECISION','BUG');
PROMPT Q7 All agents including unassigned
SELECT a.agent_name,COUNT(t.task_id) assigned_tasks FROM agents a LEFT JOIN tasks t ON t.agent_id=a.agent_id GROUP BY a.agent_name ORDER BY a.agent_name;
PROMPT Q8 Memory type counts and average importance
SELECT memory_type,COUNT(*) total_memories,ROUND(AVG(importance),2) avg_importance FROM memories GROUP BY memory_type ORDER BY total_memories DESC;
PROMPT Q9 Completed versus total tasks by project
SELECT p.project_name,COUNT(t.task_id) total_tasks,COUNT(CASE WHEN t.status='COMPLETED' THEN 1 END) completed_tasks FROM projects p LEFT JOIN tasks t ON t.project_id=p.project_id GROUP BY p.project_name ORDER BY p.project_name;
PROMPT Q10 Tags used at least twice
SELECT t.tag_name,COUNT(*) memory_count FROM tags t JOIN memory_tags mt ON mt.tag_id=t.tag_id GROUP BY t.tag_name HAVING COUNT(*)>=2 ORDER BY memory_count DESC;
PROMPT Q11 Sessions and generated memories by model
SELECT a.model_name,COUNT(DISTINCT s.session_id) sessions_operated,COUNT(m.memory_id) memories_generated FROM agents a LEFT JOIN sessions s ON s.agent_id=a.agent_id LEFT JOIN memories m ON m.session_id=s.session_id GROUP BY a.model_name ORDER BY a.model_name;
PROMPT Q12 Memories above their project average
SELECT m.memory_id,m.title,m.importance,p.project_name FROM memories m JOIN projects p ON p.project_id=m.project_id WHERE m.importance>(SELECT AVG(m2.importance) FROM memories m2 WHERE m2.project_id=m.project_id);
PROMPT Q13 Tasks without a memory
SELECT t.task_id,t.title FROM tasks t WHERE NOT EXISTS (SELECT 1 FROM memories m WHERE m.task_id=t.task_id);
PROMPT Q14 Developers who worked on projects with critical tasks
SELECT DISTINCT u.name,u.email FROM users u WHERE EXISTS (SELECT 1 FROM sessions s WHERE s.user_id=u.user_id AND s.project_id IN (SELECT project_id FROM tasks WHERE priority='CRITICAL'));
PROMPT Q15 Ranked context for ContextDB
SELECT m.memory_id,m.title,m.importance,COUNT(mt.tag_id) tag_count,(m.importance*10+COUNT(mt.tag_id)*5) relevance_score FROM memories m LEFT JOIN memory_tags mt ON mt.memory_id=m.memory_id WHERE m.project_id=1 GROUP BY m.memory_id,m.title,m.importance ORDER BY relevance_score DESC,m.memory_id FETCH FIRST 5 ROWS ONLY;
EXIT;

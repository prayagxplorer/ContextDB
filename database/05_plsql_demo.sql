WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET SERVEROUTPUT ON
SET LINESIZE 180
SET PAGESIZE 100
-- Only temporary rows; no changes to existing work. DDL is deliberately absent.
VARIABLE demo_project NUMBER
VARIABLE demo_task NUMBER
VARIABLE demo_memory NUMBER
BEGIN
 INSERT INTO projects(project_name,description) VALUES('PLSQL demo '||SYS_GUID(),'Rollback-only demonstration') RETURNING project_id INTO :demo_project;
 INSERT INTO tasks(project_id,title,description) VALUES(:demo_project,'First demo task','Cursor processing') RETURNING task_id INTO :demo_task;
 INSERT INTO tasks(project_id,title,description,status) VALUES(:demo_project,'Second demo task','Blocked work counts as open','BLOCKED');
 INSERT INTO memories(project_id,task_id,title,content,memory_type,importance) VALUES(:demo_project,:demo_task,'Demo knowledge','Temporary content','FINDING',4) RETURNING memory_id INTO :demo_memory;
END;
/
PROMPT Assignment procedure: assign then unassign
BEGIN
 FOR a IN (SELECT agent_id FROM agents ORDER BY agent_id FETCH FIRST 1 ROW ONLY) LOOP
  sp_assign_task(:demo_task,a.agent_id);
 END LOOP;
END;
/
SELECT task_id,agent_id FROM tasks WHERE task_id=:demo_task;
EXEC sp_assign_task(:demo_task,NULL);
SELECT task_id,agent_id FROM tasks WHERE task_id=:demo_task;
PROMPT Completion and reopen trigger
EXEC sp_update_task_status(:demo_task,'COMPLETED');
SELECT task_id,status,completed_at FROM tasks WHERE task_id=:demo_task;
EXEC sp_update_task_status(:demo_task,'OPEN');
SELECT task_id,status,completed_at FROM tasks WHERE task_id=:demo_task;
PROMPT Memory update trigger
SELECT updated_at FROM memories WHERE memory_id=:demo_memory;
UPDATE memories SET content='Updated demonstration content' WHERE memory_id=:demo_memory;
SELECT updated_at FROM memories WHERE memory_id=:demo_memory;
PROMPT SQL-callable functions and explicit cursor
SELECT fn_memory_relevance(:demo_memory) relevance_score,fn_project_open_task_count(:demo_project) open_tasks FROM dual;
EXEC sp_project_task_report(:demo_project);
PROMPT Controlled negative cases
BEGIN
 BEGIN sp_assign_task(:demo_task,-1); raise_application_error(-20999,'Expected failure missing');
 EXCEPTION WHEN OTHERS THEN IF SQLCODE<>-20002 THEN RAISE; END IF; DBMS_OUTPUT.PUT_LINE('PASS: invalid agent rejected'); END;
 BEGIN sp_update_task_status(:demo_task,'INVALID'); raise_application_error(-20999,'Expected failure missing');
 EXCEPTION WHEN OTHERS THEN IF SQLCODE<>-20003 THEN RAISE; END IF; DBMS_OUTPUT.PUT_LINE('PASS: invalid status rejected'); END;
END;
/
PROMPT Tag failure rolls back the entire attempted memory transaction
DECLARE v_memory NUMBER; v_count NUMBER;
BEGIN
 SAVEPOINT invalid_tag_demo;
 BEGIN
  INSERT INTO memories(project_id,title,content,memory_type) VALUES(:demo_project,'Must roll back','Invalid tag test','FINDING') RETURNING memory_id INTO v_memory;
  INSERT INTO memory_tags VALUES(v_memory,-1);
  raise_application_error(-20999,'Expected FK failure missing');
 EXCEPTION WHEN OTHERS THEN
  IF SQLCODE<>-2291 THEN RAISE; END IF;
  ROLLBACK TO invalid_tag_demo;
 END;
 SELECT COUNT(*) INTO v_count FROM memories WHERE memory_id=v_memory;
 IF v_count<>0 THEN raise_application_error(-20999,'Rollback failed'); END IF;
 DBMS_OUTPUT.PUT_LINE('PASS: failed tag association left no memory');
END;
/
PROMPT Delete cascades tag mappings
INSERT INTO memory_tags SELECT :demo_memory,tag_id FROM tags ORDER BY tag_id FETCH FIRST 1 ROW ONLY;
SELECT COUNT(*) mappings_before FROM memory_tags WHERE memory_id=:demo_memory;
DELETE FROM memories WHERE memory_id=:demo_memory;
SELECT COUNT(*) mappings_after FROM memory_tags WHERE memory_id=:demo_memory;
ROLLBACK;
SELECT COUNT(*) demo_projects_remaining FROM projects WHERE project_id=:demo_project;
EXIT;

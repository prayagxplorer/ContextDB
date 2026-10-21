-- Forward-only installation. Does not recreate tables or modify existing rows.
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET SERVEROUTPUT ON
SET LINESIZE 160
COLUMN object_name FORMAT A32
COLUMN object_type FORMAT A12
COLUMN status FORMAT A10
CREATE OR REPLACE PROCEDURE sp_assign_task(p_task_id NUMBER, p_agent_id NUMBER) AS
 v_id NUMBER;
BEGIN
 BEGIN
  SELECT task_id INTO v_id FROM tasks WHERE task_id=p_task_id FOR UPDATE;
 EXCEPTION WHEN NO_DATA_FOUND THEN raise_application_error(-20001,'Task not found'); END;
 IF p_agent_id IS NOT NULL THEN
  BEGIN
   SELECT agent_id INTO v_id FROM agents WHERE agent_id=p_agent_id;
  EXCEPTION WHEN NO_DATA_FOUND THEN raise_application_error(-20002,'Agent not found'); END;
 END IF;
 UPDATE tasks SET agent_id=p_agent_id WHERE task_id=p_task_id;
END;
/
CREATE OR REPLACE PROCEDURE sp_update_task_status(p_task_id NUMBER, p_status VARCHAR2) AS
BEGIN
 IF p_status IS NULL OR p_status NOT IN ('OPEN','IN_PROGRESS','COMPLETED','BLOCKED') THEN
  raise_application_error(-20003,'Invalid task status');
 END IF;
 UPDATE tasks SET status=p_status WHERE task_id=p_task_id;
 IF SQL%ROWCOUNT=0 THEN raise_application_error(-20001,'Task not found'); END IF;
END;
/
CREATE OR REPLACE FUNCTION fn_memory_relevance(p_memory_id NUMBER) RETURN NUMBER AS
 v_score NUMBER;
BEGIN
 SELECT m.importance*10 + (SELECT COUNT(*)*5 FROM memory_tags mt WHERE mt.memory_id=m.memory_id)
 INTO v_score FROM memories m WHERE m.memory_id=p_memory_id;
 RETURN v_score;
EXCEPTION WHEN NO_DATA_FOUND THEN raise_application_error(-20004,'Memory not found');
END;
/
CREATE OR REPLACE FUNCTION fn_project_open_task_count(p_project_id NUMBER) RETURN NUMBER AS
 v_count NUMBER; v_id NUMBER;
BEGIN
 SELECT project_id INTO v_id FROM projects WHERE project_id=p_project_id;
 SELECT COUNT(*) INTO v_count FROM tasks WHERE project_id=p_project_id AND status<>'COMPLETED';
 RETURN v_count; -- BLOCKED is open work.
EXCEPTION WHEN NO_DATA_FOUND THEN raise_application_error(-20005,'Project not found');
END;
/
CREATE OR REPLACE TRIGGER trg_memories_updated_at
 BEFORE UPDATE ON memories FOR EACH ROW
BEGIN
 :NEW.updated_at:=CURRENT_TIMESTAMP;
END;
/
CREATE OR REPLACE TRIGGER trg_tasks_completion_stamp
 BEFORE INSERT OR UPDATE OF status,completed_at ON tasks FOR EACH ROW
BEGIN
 IF :NEW.status='COMPLETED' THEN
  IF INSERTING THEN
   :NEW.completed_at:=COALESCE(:NEW.completed_at,CURRENT_TIMESTAMP);
  ELSIF :OLD.status<>'COMPLETED' THEN
   :NEW.completed_at:=CURRENT_TIMESTAMP;
  ELSE
   :NEW.completed_at:=COALESCE(:OLD.completed_at,CURRENT_TIMESTAMP);
  END IF;
 ELSE
  :NEW.completed_at:=NULL;
 END IF;
END;
/
-- SQL*Plus treats compilation warnings as success; require all six live objects.
DECLARE v_errors NUMBER; v_valid NUMBER;
BEGIN
 SELECT COUNT(*) INTO v_errors FROM user_errors WHERE name IN
 ('SP_ASSIGN_TASK','SP_UPDATE_TASK_STATUS','FN_MEMORY_RELEVANCE','FN_PROJECT_OPEN_TASK_COUNT',
 'TRG_MEMORIES_UPDATED_AT','TRG_TASKS_COMPLETION_STAMP');
 SELECT COUNT(*) INTO v_valid FROM user_objects WHERE status='VALID' AND
 ((object_name IN ('SP_ASSIGN_TASK','SP_UPDATE_TASK_STATUS') AND object_type='PROCEDURE') OR
  (object_name IN ('FN_MEMORY_RELEVANCE','FN_PROJECT_OPEN_TASK_COUNT') AND object_type='FUNCTION') OR
  (object_name IN ('TRG_MEMORIES_UPDATED_AT','TRG_TASKS_COMPLETION_STAMP') AND object_type='TRIGGER'));
 IF v_errors>0 OR v_valid<>6 THEN
  raise_application_error(-20009,'PL/SQL installation incomplete; inspect USER_ERRORS and USER_OBJECTS');
 END IF;
END;
/
SELECT object_name,object_type,status FROM user_objects WHERE object_name IN ('SP_ASSIGN_TASK','SP_UPDATE_TASK_STATUS','FN_MEMORY_RELEVANCE','FN_PROJECT_OPEN_TASK_COUNT','TRG_MEMORIES_UPDATED_AT','TRG_TASKS_COMPLETION_STAMP') ORDER BY object_type,object_name;
EXIT;

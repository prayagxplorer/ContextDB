-- Forward-only installation. Does not recreate tables or modify existing rows.
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
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
EXIT;

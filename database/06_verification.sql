WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
SET SERVEROUTPUT ON
SET PAGESIZE 200
SET LINESIZE 200
COLUMN table_name FORMAT A15
COLUMN constraint_name FORMAT A32
COLUMN object_name FORMAT A32
COLUMN object_type FORMAT A12
COLUMN status FORMAT A10
COLUMN text FORMAT A80
DECLARE v_tables NUMBER; v_rows NUMBER; v_invalid NUMBER;
BEGIN
 SELECT COUNT(*) INTO v_tables FROM user_tables WHERE table_name IN ('USERS','AGENTS','PROJECTS','SESSIONS','TASKS','MEMORIES','TAGS','MEMORY_TAGS');
 IF v_tables<>8 THEN raise_application_error(-20010,'Expected exactly eight application tables'); END IF;
 FOR t IN (SELECT table_name FROM user_tables WHERE table_name IN ('USERS','AGENTS','PROJECTS','SESSIONS','TASKS','MEMORIES','TAGS','MEMORY_TAGS') ORDER BY table_name) LOOP
  EXECUTE IMMEDIATE 'SELECT COUNT(*) FROM '||DBMS_ASSERT.SQL_OBJECT_NAME(t.table_name) INTO v_rows;
  DBMS_OUTPUT.PUT_LINE(t.table_name||': '||v_rows);
  IF v_rows<10 THEN raise_application_error(-20011,'Expected at least ten rows in '||t.table_name); END IF;
 END LOOP;
 SELECT COUNT(*) INTO v_invalid FROM user_constraints WHERE table_name IN
 ('USERS','AGENTS','PROJECTS','SESSIONS','TASKS','MEMORIES','TAGS','MEMORY_TAGS') AND status<>'ENABLED';
 IF v_invalid>0 THEN raise_application_error(-20012,'Disabled application constraints'); END IF;
 SELECT COUNT(*) INTO v_rows FROM user_objects WHERE object_name IN
 ('SP_ASSIGN_TASK','SP_UPDATE_TASK_STATUS','SP_PROJECT_TASK_REPORT','FN_MEMORY_RELEVANCE','FN_PROJECT_OPEN_TASK_COUNT','TRG_MEMORIES_UPDATED_AT','TRG_TASKS_COMPLETION_STAMP') AND status='VALID';
 IF v_rows<>7 THEN raise_application_error(-20013,'Expected seven valid PL/SQL objects'); END IF;
 SELECT COUNT(*) INTO v_invalid FROM memories m LEFT JOIN tasks t ON t.task_id=m.task_id LEFT JOIN sessions s ON s.session_id=m.session_id
 WHERE t.project_id<>m.project_id OR s.project_id<>m.project_id;
 IF v_invalid>0 THEN raise_application_error(-20014,'Cross-project memory associations found'); END IF;
 DBMS_OUTPUT.PUT_LINE('PASS: constraints enabled, seven programs valid, associations consistent');
END;
/
SELECT table_name,constraint_name,constraint_type,status FROM user_constraints WHERE table_name IN ('USERS','AGENTS','PROJECTS','SESSIONS','TASKS','MEMORIES','TAGS','MEMORY_TAGS') ORDER BY table_name,constraint_type,constraint_name;
SELECT object_name,object_type,status FROM user_objects WHERE object_name IN ('SP_ASSIGN_TASK','SP_UPDATE_TASK_STATUS','SP_PROJECT_TASK_REPORT','FN_MEMORY_RELEVANCE','FN_PROJECT_OPEN_TASK_COUNT','TRG_MEMORIES_UPDATED_AT','TRG_TASKS_COMPLETION_STAMP') ORDER BY object_type,object_name;
SELECT name,line,text FROM user_errors WHERE name IN ('SP_ASSIGN_TASK','SP_UPDATE_TASK_STATUS','SP_PROJECT_TASK_REPORT','FN_MEMORY_RELEVANCE','FN_PROJECT_OPEN_TASK_COUNT','TRG_MEMORIES_UPDATED_AT','TRG_TASKS_COMPLETION_STAMP') ORDER BY name,sequence;
SELECT m.memory_id FROM memories m LEFT JOIN tasks t ON t.task_id=m.task_id LEFT JOIN sessions s ON s.session_id=m.session_id
WHERE t.project_id<>m.project_id OR s.project_id<>m.project_id;
EXIT;

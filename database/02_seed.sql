-- Clean schema only; never reseed a populated database.
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK
DECLARE v_count NUMBER;
BEGIN
 SELECT (SELECT COUNT(*) FROM users)+(SELECT COUNT(*) FROM agents)+(SELECT COUNT(*) FROM projects)+
 (SELECT COUNT(*) FROM sessions)+(SELECT COUNT(*) FROM tasks)+(SELECT COUNT(*) FROM memories)+
 (SELECT COUNT(*) FROM tags)+(SELECT COUNT(*) FROM memory_tags) INTO v_count FROM dual;
 IF v_count>0 THEN raise_application_error(-20010,'Seed refused: application tables are not empty'); END IF;
END;
/
INSERT INTO users(user_id,name,email,role) VALUES (1,'Asha Rao','asha@contextdb.dev','ARCHITECT');
INSERT INTO users(user_id,name,email,role) VALUES (2,'Ravi Shah','ravi@contextdb.dev','DEVELOPER');
INSERT INTO users(user_id,name,email,role) VALUES (3,'Meera Iyer','meera@contextdb.dev','QA');
INSERT INTO users(user_id,name,email,role) VALUES (4,'Dev Patel','dev@contextdb.dev','TECH_LEAD');
INSERT INTO users(user_id,name,email,role) VALUES (5,'Nina Das','nina@contextdb.dev','ADMIN');
INSERT INTO users(user_id,name,email,role) VALUES (6,'Omar Khan','omar@contextdb.dev','DEVELOPER');
INSERT INTO users(user_id,name,email,role) VALUES (7,'Lina Roy','lina@contextdb.dev','QA');
INSERT INTO users(user_id,name,email,role) VALUES (8,'Kiran Bose','kiran@contextdb.dev','DEVELOPER');
INSERT INTO users(user_id,name,email,role) VALUES (9,'Sara Ali','sara@contextdb.dev','ARCHITECT');
INSERT INTO users(user_id,name,email,role) VALUES (10,'Vikram Sen','vikram@contextdb.dev','TECH_LEAD');
INSERT INTO agents(agent_id,agent_name,model_name,model_version) VALUES(1,'Atlas','GPT-4o','2024-08');
INSERT INTO agents VALUES(2,'Claude Architect','Claude-3.5-Sonnet','2024-10',SYSTIMESTAMP);
INSERT INTO agents VALUES(3,'Gemini Planner','Gemini-2.5-Pro','2.5',SYSTIMESTAMP);
INSERT INTO agents VALUES(4,'DeepSeek Reviewer','DeepSeek-R1','1.0',SYSTIMESTAMP);
INSERT INTO agents VALUES(5,'Code Falcon','GPT-4.1','1.0',SYSTIMESTAMP);
INSERT INTO agents VALUES(6,'Test Sage','Claude-3.7-Sonnet','1.0',SYSTIMESTAMP);
INSERT INTO agents VALUES(7,'Query Scout','Gemini-2.0-Flash','2.0',SYSTIMESTAMP);
INSERT INTO agents VALUES(8,'Schema Smith','GPT-4o-mini','2024-07',SYSTIMESTAMP);
INSERT INTO agents VALUES(9,'Secure Owl','o3-mini','1.0',SYSTIMESTAMP);
INSERT INTO agents VALUES(10,'Docs Weaver','Llama-3.3-70B','3.3',SYSTIMESTAMP);
INSERT INTO projects(project_id,project_name,description,status) VALUES(1,'ContextDB','Persistent context layer for AI-assisted engineering','ACTIVE');
INSERT INTO projects VALUES(2,'PayFlow','Transactional payments service','ACTIVE',SYSTIMESTAMP);
INSERT INTO projects VALUES(3,'ClinicSync','Clinical scheduling platform','ON_HOLD',SYSTIMESTAMP);
INSERT INTO projects VALUES(4,'FleetWatch','Vehicle telemetry dashboard','ACTIVE',SYSTIMESTAMP);
INSERT INTO projects VALUES(5,'LearnSpace','Online learning workspace','COMPLETED',SYSTIMESTAMP);
INSERT INTO projects VALUES(6,'InventoryHub','Multi-warehouse inventory service','ACTIVE',SYSTIMESTAMP);
INSERT INTO projects VALUES(7,'SupportDesk','Customer support workflow','ACTIVE',SYSTIMESTAMP);
INSERT INTO projects VALUES(8,'GreenGrid','Energy consumption analytics','ARCHIVED',SYSTIMESTAMP);
INSERT INTO projects VALUES(9,'TravelMate','Corporate travel planner','ACTIVE',SYSTIMESTAMP);
INSERT INTO projects VALUES(10,'LegalLens','Contract review assistant','ON_HOLD',SYSTIMESTAMP);
INSERT INTO sessions(session_id,user_id,agent_id,project_id,start_time,end_time,status) VALUES(1,1,2,1,SYSTIMESTAMP-10,SYSTIMESTAMP-10+INTERVAL '1' HOUR,'COMPLETED');
INSERT INTO sessions VALUES(2,2,1,1,SYSTIMESTAMP-9,SYSTIMESTAMP-9+INTERVAL '2' HOUR,'COMPLETED');
INSERT INTO sessions VALUES(3,4,3,2,SYSTIMESTAMP-8,SYSTIMESTAMP-8+INTERVAL '1' HOUR,'COMPLETED');
INSERT INTO sessions VALUES(4,3,6,3,SYSTIMESTAMP-7,NULL,'ACTIVE');
INSERT INTO sessions VALUES(5,6,5,4,SYSTIMESTAMP-6,SYSTIMESTAMP-6+INTERVAL '1' HOUR,'COMPLETED');
INSERT INTO sessions VALUES(6,8,8,5,SYSTIMESTAMP-5,SYSTIMESTAMP-5+INTERVAL '1' HOUR,'COMPLETED');
INSERT INTO sessions VALUES(7,9,9,6,SYSTIMESTAMP-4,SYSTIMESTAMP-4+INTERVAL '2' HOUR,'COMPLETED');
INSERT INTO sessions VALUES(8,10,4,7,SYSTIMESTAMP-3,NULL,'ACTIVE');
INSERT INTO sessions VALUES(9,5,7,8,SYSTIMESTAMP-2,SYSTIMESTAMP-2+INTERVAL '1' HOUR,'ABORTED');
INSERT INTO sessions VALUES(10,7,10,9,SYSTIMESTAMP-1,SYSTIMESTAMP-1+INTERVAL '1' HOUR,'COMPLETED');
INSERT INTO sessions VALUES(11,1,2,1,SYSTIMESTAMP-INTERVAL '12' HOUR,NULL,'ACTIVE');
INSERT INTO sessions VALUES(12,4,1,2,SYSTIMESTAMP-INTERVAL '6' HOUR,NULL,'ACTIVE');
INSERT INTO tasks(task_id,project_id,agent_id,title,description,priority,status,completed_at) VALUES(1,1,2,'Design schema','Map ER entities to Oracle relations','HIGH','COMPLETED',SYSTIMESTAMP-8);
INSERT INTO tasks VALUES(2,1,1,'Build context ranking','Score memories for LLM prompt','CRITICAL','IN_PROGRESS',SYSTIMESTAMP-7,NULL);
INSERT INTO tasks VALUES(3,2,3,'Add payment ledger','Create immutable settlement records','CRITICAL','OPEN',SYSTIMESTAMP-6,NULL);
INSERT INTO tasks VALUES(4,3,6,'Validate appointments','Test collision detection','HIGH','BLOCKED',SYSTIMESTAMP-5,NULL);
INSERT INTO tasks VALUES(5,4,5,'Ingest GPS events','Process telemetry stream','MEDIUM','OPEN',SYSTIMESTAMP-4,NULL);
INSERT INTO tasks VALUES(6,5,8,'Export grades','Generate instructor reports','LOW','COMPLETED',SYSTIMESTAMP-4,SYSTIMESTAMP-3);
INSERT INTO tasks VALUES(7,6,9,'Rotate API keys','Automate secret rollover','CRITICAL','IN_PROGRESS',SYSTIMESTAMP-3,NULL);
INSERT INTO tasks VALUES(8,7,4,'Triage escalations','Route urgent customer tickets','HIGH','OPEN',SYSTIMESTAMP-2,NULL);
INSERT INTO tasks VALUES(9,8,7,'Archive dashboards','Retire unused visualizations','LOW','COMPLETED',SYSTIMESTAMP-2,SYSTIMESTAMP-1);
INSERT INTO tasks VALUES(10,9,10,'Policy cache','Cache approved travel policies','MEDIUM','OPEN',SYSTIMESTAMP-1,NULL);
INSERT INTO tasks VALUES(11,10,NULL,'Redact clauses','Detect personally identifiable contract data','HIGH','OPEN',SYSTIMESTAMP,NULL);
INSERT INTO tasks VALUES(12,1,2,'Write API tests','Cover FastAPI endpoints','HIGH','OPEN',SYSTIMESTAMP,NULL);
INSERT INTO tasks VALUES(13,10,10,'Create retention policy','Define how long redacted contract artifacts are retained','MEDIUM','OPEN',SYSTIMESTAMP,NULL);
INSERT INTO memories(memory_id,project_id,session_id,task_id,title,content,memory_type,importance) VALUES(1,1,1,1,'Oracle is the system of record','Use Oracle foreign keys and named constraints for all persistent knowledge.','DECISION',5);
INSERT INTO memories VALUES(2,1,2,2,'Context score formula','Rank context as importance times ten plus tag count times five.','DECISION',5,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO memories VALUES(3,2,3,3,'Payment consistency','Payment ledger requires ACID transactions; do not replace with an eventually consistent store.','CONSTRAINT',5,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO memories VALUES(4,3,4,4,'Timezone collision bug','Appointments were compared in local time; normalize all instants to UTC.','BUG',4,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO memories VALUES(5,4,5,5,'Telemetry batching','Batch GPS points every thirty seconds to reduce write pressure.','SOLUTION',3,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO memories VALUES(6,5,6,6,'Grade export requirement','CSV exports must include course and assessment identifiers.','REQUIREMENT',4,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO memories VALUES(7,6,7,7,'Key rotation rule','API keys expire every ninety days and must be audit logged.','RULE',5,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO memories VALUES(8,7,8,8,'Escalation SLA','Critical customer tickets require a fifteen minute acknowledgement.','CONSTRAINT',4,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO memories VALUES(9,8,9,9,'Archive finding','Unused dashboards still referenced legacy PostgreSQL credentials.','FINDING',3,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO memories VALUES(10,9,10,10,'Travel policy decision','Prefer approved carriers before comparing price.','DECISION',4,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO memories VALUES(11,10,NULL,11,'PII redaction','Contract uploads must redact names before model processing.','RULE',5,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO memories VALUES(12,1,11,12,'Parameterized SQL only','All API filters use binds to prevent injection.','RULE',5,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO memories VALUES(13,1,1,1,'Identity columns','Generated by default identities allow deterministic course seed IDs.','FINDING',3,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO memories VALUES(14,2,12,3,'Settlement retry','Idempotency key prevents duplicate payment settlement.','SOLUTION',5,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO memories VALUES(15,4,5,5,'Sensor requirement','GPS events require device ID and observed timestamp.','REQUIREMENT',4,SYSTIMESTAMP,SYSTIMESTAMP);
INSERT INTO tags(tag_id,tag_name) VALUES(1,'oracle');
INSERT INTO tags(tag_id,tag_name) SELECT LEVEL+1, CASE LEVEL WHEN 1 THEN 'architecture' WHEN 2 THEN 'security' WHEN 3 THEN 'api' WHEN 4 THEN 'database' WHEN 5 THEN 'bug' WHEN 6 THEN 'payments' WHEN 7 THEN 'testing' WHEN 8 THEN 'performance' WHEN 9 THEN 'requirements' END FROM dual CONNECT BY LEVEL <= 9;
INSERT ALL
 INTO memory_tags VALUES(1,1) INTO memory_tags VALUES(1,2) INTO memory_tags VALUES(2,2) INTO memory_tags VALUES(2,4) INTO memory_tags VALUES(3,7)
 INTO memory_tags VALUES(3,5) INTO memory_tags VALUES(4,6) INTO memory_tags VALUES(5,9) INTO memory_tags VALUES(6,10) INTO memory_tags VALUES(7,3)
 INTO memory_tags VALUES(8,10) INTO memory_tags VALUES(9,3) INTO memory_tags VALUES(10,2) INTO memory_tags VALUES(11,3) INTO memory_tags VALUES(12,3)
 INTO memory_tags VALUES(12,4) INTO memory_tags VALUES(13,1) INTO memory_tags VALUES(14,7) INTO memory_tags VALUES(15,10) INTO memory_tags VALUES(15,9)
SELECT 1 FROM dual;
COMMIT;
-- Explicit seed IDs do not advance Oracle identity generators. Advance each
-- generator to the seeded high-water mark so later API inserts are safe.
ALTER TABLE users MODIFY user_id GENERATED BY DEFAULT AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE agents MODIFY agent_id GENERATED BY DEFAULT AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE projects MODIFY project_id GENERATED BY DEFAULT AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE sessions MODIFY session_id GENERATED BY DEFAULT AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE tasks MODIFY task_id GENERATED BY DEFAULT AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE memories MODIFY memory_id GENERATED BY DEFAULT AS IDENTITY (START WITH LIMIT VALUE);
ALTER TABLE tags MODIFY tag_id GENERATED BY DEFAULT AS IDENTITY (START WITH LIMIT VALUE);
SELECT 'USERS' table_name,COUNT(*) row_count FROM users UNION ALL SELECT 'AGENTS',COUNT(*) FROM agents UNION ALL SELECT 'PROJECTS',COUNT(*) FROM projects UNION ALL SELECT 'SESSIONS',COUNT(*) FROM sessions UNION ALL SELECT 'TASKS',COUNT(*) FROM tasks UNION ALL SELECT 'MEMORIES',COUNT(*) FROM memories UNION ALL SELECT 'TAGS',COUNT(*) FROM tags UNION ALL SELECT 'MEMORY_TAGS',COUNT(*) FROM memory_tags;
EXIT;

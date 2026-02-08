-- Mission Control Schema
-- Prefix: mc_ para separar de tablas de DeHyl

-- Agentes del sistema
CREATE TABLE mc_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  session_key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'blocked')),
  current_task_id UUID,
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tareas
CREATE TABLE mc_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'assigned', 'in_progress', 'review', 'done', 'blocked')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by UUID REFERENCES mc_agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ
);

-- Asignaciones (muchos-a-muchos)
CREATE TABLE mc_task_assignees (
  task_id UUID REFERENCES mc_tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES mc_agents(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (task_id, agent_id)
);

-- Mensajes/Comentarios en tareas
CREATE TABLE mc_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES mc_tasks(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES mc_agents(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feed de actividad
CREATE TABLE mc_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES mc_agents(id),
  activity_type TEXT NOT NULL,
  message TEXT NOT NULL,
  task_id UUID REFERENCES mc_tasks(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notificaciones (@mentions)
CREATE TABLE mc_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentioned_agent_id UUID REFERENCES mc_agents(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES mc_agents(id),
  task_id UUID REFERENCES mc_tasks(id),
  content TEXT NOT NULL,
  delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_mc_tasks_status ON mc_tasks(status);
CREATE INDEX idx_mc_tasks_priority ON mc_tasks(priority);
CREATE INDEX idx_mc_activity_created ON mc_activity(created_at DESC);
CREATE INDEX idx_mc_notifications_undelivered ON mc_notifications(mentioned_agent_id, delivered) WHERE NOT delivered;

-- Insert inicial: Los 4 agentes
INSERT INTO mc_agents (name, role, session_key) VALUES
  ('Rob', 'Gerencia', 'agent:main:main'),
  ('Adam', 'Finanzas', 'agent:adam:main'),
  ('Amanda', 'Operaciones', 'agent:amanda:main'),
  ('Adan', 'Código', 'agent:adan:main');

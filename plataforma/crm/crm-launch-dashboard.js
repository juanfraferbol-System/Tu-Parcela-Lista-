(function () {
  'use strict';

  const getClient = () => window.tplSupabase || window.tplCrmSupabase;
  const byId = (id) => document.getElementById(id);
  const fmt = (value) => new Intl.NumberFormat('es-CL').format(Number(value || 0));
  const date = (value) =>
    value
      ? new Date(value).toLocaleString('es-CL', {
          dateStyle: 'short',
          timeStyle: 'short'
        })
      : 'Sin fecha';

  const empty = (message, cols) =>
    `<tr><td colspan="${cols}" class="launch-empty">${message}</td></tr>`;

  let currentClients = [];

  function setMetric(id, value) {
    const node = byId(id);
    if (node) node.textContent = fmt(value);
  }

  function localErrors() {
    try {
      return JSON.parse(localStorage.getItem('tpl_error_logs') || '[]');
    } catch {
      return [];
    }
  }

  function renderFunnel(rows) {
    const body = byId('launch-funnel-body');
    if (!body) return;

    const order = window.TPL_CONFIG?.embudo || [];
    const map = new Map((rows || []).map((row) => [row.etapa, row]));

    let previous = null;

    body.innerHTML = order
      .map((stage) => {
        const row = map.get(stage) || {
          personas: 0,
          dias_promedio: null
        };

        const conversion =
          previous && previous.personas > 0
            ? `${Math.round((row.personas / previous.personas) * 100)}%`
            : '—';

        previous = row;

        return `
          <tr>
            <td>${stage.replaceAll('_', ' ')}</td>
            <td>${fmt(row.personas)}</td>
            <td>${conversion}</td>
            <td>
              ${
                row.dias_promedio === null
                  ? 'Sin datos'
                  : `${Number(row.dias_promedio).toFixed(1)} días`
              }
            </td>
          </tr>
        `;
      })
      .join('');
  }

  function renderTasks(tasks, clients) {
    const body = byId('launch-task-body');
    if (!body) return;

    const names = new Map(
      (clients || []).map((item) => [item.id, item.nombre])
    );

    if (!tasks.length) {
      body.innerHTML = empty(
        'No hay tareas pendientes. El panel está al día.',
        5
      );
      return;
    }

    body.innerHTML = tasks
      .slice(0, 20)
      .map(
        (task) => `
          <tr>
            <td>${task.prioridad || 'media'}</td>
            <td>${task.titulo || 'Sin título'}</td>
            <td>${names.get(task.cliente_id) || 'Cliente'}</td>
            <td>${date(task.vence_en)}</td>
            <td>
              <button
                class="btn-action"
                data-resolve-task="${task.id}"
              >
                Marcar resuelta
              </button>
            </td>
          </tr>
        `
      )
      .join('');
  }

  function renderOpportunities(clients) {
    const body = byId('launch-opportunity-body');
    if (!body) return;

    const ranked = [...(clients || [])]
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, 12);

    if (!ranked.length) {
      body.innerHTML = empty(
        'Aún no hay oportunidades para priorizar.',
        5
      );
      return;
    }

    body.innerHTML = ranked
      .map((item) => {
        const detail =
          Object.entries(item.score_detalle || {})
            .filter(([, points]) => Number(points) > 0)
            .map(
              ([signal, points]) =>
                `${signal.replaceAll('_', ' ')} +${points}`
            )
            .join(', ') || 'Sin señales positivas registradas';

        return `
          <tr>
            <td>${item.nombre || 'Cliente'}</td>
            <td>${String(item.etapa || 'visitante').replaceAll('_', ' ')}</td>
            <td>${fmt(item.score)}</td>
            <td>${item.prioridad || 'Sin actividad'}</td>
            <td>${detail}</td>
          </tr>
        `;
      })
      .join('');
  }

  function renderActivity(events) {
    const body = byId('launch-activity-body');
    if (!body) return;

    body.innerHTML = events.length
      ? events
          .slice(0, 20)
          .map(
            (event) => `
              <tr>
                <td>${date(event.creado_en)}</td>
                <td>${String(event.evento || 'evento').replaceAll('_', ' ')}</td>
                <td>${event.origen || 'directo'}</td>
                <td>${event.pagina || '—'}</td>
              </tr>
            `
          )
          .join('')
      : empty(
          'Aún no hay actividad registrada en las últimas 24 horas.',
          4
        );
  }

  async function loadDashboard() {
    const client = getClient();

    if (!client) {
      console.warn('CRM: cliente Supabase no disponible.');
      return;
    }

    if (!byId('launch-daily-panel')) return;

    const now = Date.now();
    const dayAgo = new Date(now - 86400000).toISOString();
    const weekAgo = new Date(now - 7 * 86400000).toISOString();
    const twoDaysAgo = new Date(now - 2 * 86400000).toISOString();

    const [
      clientsRes,
      tasksRes,
      projectsRes,
      eventsRes,
      publicationsRes,
      funnelRes
    ] = await Promise.all([
      client
        .from('clientes')
        .select(
          'id,nombre,etapa,prioridad,score,score_detalle,origen,etapa_ingresada_en,ultimo_contacto_en,creado_en'
        )
        .order('creado_en', { ascending: false }),

      client
        .from('crm_tareas')
        .select('*')
        .eq('estado', 'pendiente')
        .order('vence_en', { ascending: true }),

      client
        .from('proyectos')
        .select(
          'id,cliente_id,estado,total,origen,creado_en,activado_en'
        )
        .order('creado_en', { ascending: false }),

      client
        .from('crm_eventos')
        .select('id,evento,etapa,origen,pagina,creado_en')
        .gte('creado_en', dayAgo)
        .order('creado_en', { ascending: false }),

      client
        .from('publicaciones')
        .select('id', { count: 'exact', head: true })
        .in('estado', ['borrador', 'pendiente_revision']),

      client.from('crm_resumen_embudo').select('*')
    ]);

    const responses = [
      clientsRes,
      tasksRes,
      projectsRes,
      eventsRes,
      publicationsRes,
      funnelRes
    ];

    const failed = responses.find((result) => result.error);
    const status = byId('launch-dashboard-status');

    if (failed) {
      console.error('Error cargando dashboard CRM:', failed.error);

      if (status) {
        status.textContent =
          'No fue posible cargar completamente el panel comercial. Revisa permisos y migraciones de Supabase.';
        status.hidden = false;
      }

      return;
    }

    if (status) status.hidden = true;

    const clients = clientsRes.data || [];
    const tasks = tasksRes.data || [];
    const projects = projectsRes.data || [];
    const events = eventsRes.data || [];
    const errors = localErrors();

    currentClients = clients;

    setMetric(
      'launch-new-leads',
      clients.filter(
        (item) =>
          item.creado_en &&
          new Date(item.creado_en).getTime() >= new Date(dayAgo).getTime()
      ).length
    );

    setMetric(
      'launch-uncontacted',
      clients.filter((item) => !item.ultimo_contacto_en).length
    );

    setMetric(
      'launch-overdue',
      tasks.filter(
        (item) =>
          item.vence_en &&
          new Date(item.vence_en).getTime() < now
      ).length
    );

    setMetric(
      'launch-visits',
      tasks.filter((item) => item.tipo === 'confirmar_visita').length
    );

    setMetric(
      'launch-recent-quotes',
      projects.filter(
        (item) =>
          item.creado_en &&
          new Date(item.creado_en).getTime() >= new Date(weekAgo).getTime()
      ).length
    );

    setMetric(
      'launch-stale-quotes',
      projects.filter(
        (item) =>
          item.estado === 'cotizacion_generada' &&
          item.creado_en &&
          new Date(item.creado_en).getTime() <=
            new Date(twoDaysAgo).getTime()
      ).length
    );

    setMetric(
      'launch-active-projects',
      projects.filter((item) => item.estado === 'activo').length
    );

    setMetric(
      'launch-pending-publications',
      publicationsRes.count || 0
    );

    setMetric('launch-errors', errors.length);

    setMetric(
      'launch-automation-failures',
      events.filter(
        (item) => item.evento === 'automatizacion_fallida'
      ).length
    );

    setMetric(
      'launch-security-alerts',
      events.filter(
        (item) => item.evento === 'alerta_seguridad'
      ).length
    );

    setMetric('launch-activity-count', events.length);

    renderFunnel(funnelRes.data || []);
    renderOpportunities(clients);
    renderTasks(tasks, clients);
    renderActivity(events);
  }

  function pickClient() {
    const query = prompt('Escribe el nombre del cliente:');
    if (!query) return null;

    const normalized = query.trim().toLowerCase();

    return (
      currentClients.find((item) =>
        String(item.nombre || '')
          .toLowerCase()
          .includes(normalized)
      ) || null
    );
  }

  document.addEventListener('click', async (event) => {
    const client = getClient();
    const button = event.target.closest('[data-resolve-task]');

    if (button) {
      if (!client) {
        alert('No hay conexión disponible con Supabase.');
        return;
      }

      button.disabled = true;

      const { error } = await client
        .from('crm_tareas')
        .update({
          estado: 'resuelta',
          resuelta_en: new Date().toISOString()
        })
        .eq('id', button.dataset.resolveTask);

      if (error) {
        console.error('Error resolviendo tarea:', error);
        button.disabled = false;
        alert('No se pudo marcar la tarea como resuelta.');
        return;
      }

      await loadDashboard();
      return;
    }

    const targetLink = event.target.closest(
      '.launch-actions [data-target]'
    );

    if (targetLink) {
      event.preventDefault();

      document
        .querySelectorAll('.dashboard-section')
        .forEach((section) => {
          section.style.display = 'none';
          section.classList.remove('active-section');
        });

      const target = byId(targetLink.dataset.target);

      if (target) {
        target.style.display = 'block';
        target.classList.add('active-section');
      }

      return;
    }

    if (event.target.id === 'launch-create-task') {
      if (!client) {
        alert('No hay conexión disponible con Supabase.');
        return;
      }

      const selected = pickClient();

      if (!selected) {
        alert('No encontramos ese cliente.');
        return;
      }

      const title = prompt(
        'Tarea de seguimiento:',
        'Contactar interesado'
      );

      if (!title) return;

      const { error } = await client
        .from('crm_tareas')
        .insert([
          {
            cliente_id: selected.id,
            tipo: 'seguimiento_manual',
            titulo: title,
            prioridad: 'media',
            estado: 'pendiente',
            vence_en: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('Error creando tarea:', error);
        alert('No se pudo crear la tarea.');
        return;
      }

      await loadDashboard();
      return;
    }

    if (event.target.id === 'launch-register-contact') {
      if (!client) {
        alert('No hay conexión disponible con Supabase.');
        return;
      }

      const selected = pickClient();

      if (!selected) {
        alert('No encontramos ese cliente.');
        return;
      }

      const now = new Date().toISOString();

      const { error: clientError } = await client
        .from('clientes')
        .update({
          ultimo_contacto_en: now,
          etapa: 'contactado',
          etapa_ingresada_en: now
        })
        .eq('id', selected.id);

      if (clientError) {
        console.error(
          'Error actualizando contacto:',
          clientError
        );
        alert('No se pudo actualizar el cliente.');
        return;
      }

      const { error: eventError } = await client
        .from('crm_eventos')
        .insert([
          {
            evento: 'contacto_registrado',
            etapa: 'contactado',
            cliente_id: selected.id,
            origen: 'crm',
            pagina: location.pathname,
            metadata: {
              origen: 'crm'
            }
          }
        ]);

      if (eventError) {
        console.error(
          'Error registrando evento:',
          eventError
        );
      }

      await loadDashboard();
    }
  });

  document.addEventListener('DOMContentLoaded', async () => {
    byId('launch-refresh')?.addEventListener(
      'click',
      loadDashboard
    );

    const waitForClient = async (attempt = 0) => {
      const client = getClient();

      if (!client) {
        if (attempt < 20) {
          setTimeout(() => {
            waitForClient(attempt + 1);
          }, 250);
        } else {
          console.error(
            'CRM: cliente Supabase no disponible después de esperar.'
          );
        }

        return;
      }

      client.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setTimeout(loadDashboard, 200);
        }
      });

      const {
        data: { session },
        error
      } = await client.auth.getSession();

      if (error) {
        console.error(
          'Error obteniendo sesión Supabase:',
          error
        );
        return;
      }

      if (session) {
        await loadDashboard();
      }
    };

    await waitForClient();
  });
})();


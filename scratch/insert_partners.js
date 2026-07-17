const SUPABASE_URL = 'https://qxavbqhyqaqalpzbhwmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YXZicWh5cWFxYWxwemJod21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Nzc4MTIsImV4cCI6MjA5OTU1MzgxMn0.7-z6nCdXzurbVbkWQrL7hylblqj7SFPK8oyndLOeZEA';

const partnersData = [
  {
    nombre_comercial: 'Fernando Ramirez',
    nombre_responsable: 'Fernando Ramirez',
    tipo_servicio: 'Construcción',
    especialidades: 'Kit Básico, Radier',
    region: 'Biobío',
    comunas_atendidas: 'Monte Águila',
    telefono: '56927615964',
    whatsapp: '56927615964',
    correo: 'fernando@ejemplo.cl',
    anos_experiencia: 30,
    descripcion_servicios: 'Construcción de kit básico con radier. Más de 30 años de experiencia.',
    plan_elegido: 'premium',
    estado_verificacion: 'verificado',
    rating: 5.0,
    trabajos_realizados: 3,
    slug: 'fernando-ramirez'
  },
  {
    nombre_comercial: 'Jose Cuevas Sáez',
    nombre_responsable: 'Jose Cuevas',
    tipo_servicio: 'Construcción',
    especialidades: 'General',
    region: 'Biobío',
    comunas_atendidas: 'Río Claro, Yumbel',
    telefono: '56928253194',
    whatsapp: '56928253194',
    correo: 'jose@ejemplo.cl',
    anos_experiencia: 10,
    descripcion_servicios: 'Servicios de construcción general en Río Claro y Yumbel.',
    plan_elegido: 'profesional',
    estado_verificacion: 'verificado',
    rating: 5.0,
    trabajos_realizados: 0,
    slug: 'jose-cuevas'
  },
  {
    nombre_comercial: 'Patricio Poblete',
    nombre_responsable: 'Patricio Poblete',
    tipo_servicio: 'Instalaciones Básicas',
    especialidades: 'Fosas, Pozos, Cercos, Limpieza',
    region: 'Biobío',
    comunas_atendidas: 'Laja',
    telefono: '56928217894',
    whatsapp: '56928217894',
    correo: 'patricio@ejemplo.cl',
    anos_experiencia: 5,
    descripcion_servicios: 'Especialista en fosas, pozos profundos y cercos de púas.',
    plan_elegido: 'profesional',
    estado_verificacion: 'verificado',
    rating: 4.8,
    trabajos_realizados: 0,
    slug: 'patricio-poblete'
  },
  {
    nombre_comercial: 'Felipe Gutierrez - Construcciones Lautaro',
    nombre_responsable: 'Felipe Gutierrez',
    tipo_servicio: 'Construcción',
    especialidades: 'Casas Prefabricadas, Llave en mano',
    region: 'Biobío',
    comunas_atendidas: 'Cabrero',
    telefono: '56959359288',
    whatsapp: '56959359288',
    correo: 'felipe@ejemplo.cl',
    anos_experiencia: 8,
    descripcion_servicios: 'Hacemos casas prefabricadas y trabajos completos con contrato notarial.',
    plan_elegido: 'profesional',
    estado_verificacion: 'verificado',
    rating: 4.5,
    trabajos_realizados: 0,
    slug: 'construcciones-lautaro'
  },
  {
    nombre_comercial: 'Gastón Boris',
    nombre_responsable: 'Gastón Boris',
    tipo_servicio: 'Construcción',
    especialidades: 'Metalcon, Radier, Portones, Piscinas',
    region: 'Ñuble',
    comunas_atendidas: 'Chillán',
    telefono: '56900000000',
    whatsapp: '56900000000',
    correo: 'gaston@ejemplo.cl',
    anos_experiencia: 15,
    descripcion_servicios: 'Ingeniero en construcción. Especialista en Metalcon y estructural de cemento.',
    plan_elegido: 'premium',
    estado_verificacion: 'verificado',
    rating: 4.9,
    trabajos_realizados: 1,
    slug: 'gaston-boris-metalcon'
  }
];

async function insertData() {
  for (const partner of partnersData) {
    const payload = {
      ...partner,
      nombre_empresa: partner.nombre_comercial // Legacy fallback
    };
    
    const res = await fetch(`${SUPABASE_URL}/rest/v1/contratistas`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      console.log(`✅ Insertado: ${partner.nombre_comercial}`);
    } else {
      const err = await res.json();
      console.log(`❌ Error insertando ${partner.nombre_comercial}:`, err);
    }
  }
}

insertData();

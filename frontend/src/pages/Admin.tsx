import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import api from '../api/client'

type Tab = 'certificaciones' | 'paises'

export default function Admin() {
  const [tab, setTab] = useState<Tab>('certificaciones')
  const tabs: [Tab, string][] = [
    ['certificaciones', 'Certificaciones'],
    ['paises', 'Países'],
  ]

  return (
    <Layout>
      <div className="max-w-5xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-white">Administración</h1>
          <p className="text-slate-400 mt-1">Gestión del Portal ARM</p>
        </div>
        <div className="flex gap-1 mb-6 border-b border-navy-800 flex-wrap">
          {tabs.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === key ? 'border-gold-500 text-gold-400' : 'border-transparent text-slate-400 hover:text-white'
              }`}>{label}</button>
          ))}
        </div>
        {tab === 'certificaciones' && <CertificacionesTab />}
        {tab === 'paises' && <PaisesTab />}
      </div>
    </Layout>
  )
}

/* ----------------------------- Certificaciones ---------------------------- */
function CertificacionesTab() {
  const [certs, setCerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const fetchPend = async () => {
    setLoading(true)
    try { setCerts((await api.get('/admin/certificaciones-pendientes')).data) }
    finally { setLoading(false) }
  }
  useEffect(() => { fetchPend() }, [])

  const accion = async (id: number, tipo: 'aprobar' | 'rechazar') => {
    setMsg('')
    try {
      await api.post(`/admin/certificaciones/${id}/${tipo}`)
      setMsg(tipo === 'aprobar' ? 'Certificación aprobada' : 'Certificación rechazada')
      setCerts(prev => prev.filter(c => c.id !== id))
    } catch (e: any) { setMsg(`Error: ${e?.response?.data?.detail || 'Error'}`) }
  }

  if (loading) return <p className="text-slate-400 py-10 text-center">Cargando...</p>
  return (
    <>
      {msg && <div className="bg-navy-800 rounded-lg px-4 py-3 mb-4 text-sm text-slate-200">{msg}</div>}
      {certs.length === 0 ? (
        <div className="card text-center py-16"><div className="text-5xl mb-4">✓</div>
          <h3 className="font-display text-xl font-semibold text-white">Sin certificaciones pendientes</h3></div>
      ) : (
        <div className="space-y-4">
          {certs.map(cert => (
            <div key={cert.id} className="card flex items-center gap-6">
              <div className="flex-1 min-w-0">
                <span className="font-mono text-gold-400 text-sm">{cert.numero_oec}</span>
                <p className="text-white font-medium">{cert.operador.razon_social}</p>
                <p className="text-slate-400 text-sm">RUT: {cert.operador.rut} · {cert.operador.pais.nombre}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => accion(cert.id, 'rechazar')} className="btn-danger text-sm px-4 py-2">Rechazar</button>
                <button onClick={() => accion(cert.id, 'aprobar')} className="btn-primary text-sm px-4 py-2">Aprobar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

/* --------------------------------- Países --------------------------------- */
function PaisesTab() {
  const [paises, setPaises] = useState<any[]>([])
  const [nombre, setNombre] = useState(''); const [iso, setIso] = useState(''); const [programa, setPrograma] = useState('')
  const [err, setErr] = useState('')
  const fetch = async () => setPaises((await api.get('/admin/paises')).data)
  useEffect(() => { fetch() }, [])

  const crear = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('')
    try {
      await api.post('/admin/paises', { nombre, codigo_iso: iso, programa_oea: programa || null })
      setNombre(''); setIso(''); setPrograma(''); fetch()
    } catch (e: any) {
      const d = e?.response?.data?.detail
      setErr(Array.isArray(d) ? d.map((x: any) => x.msg).join('; ') : (d || 'Error'))
    }
  }
  return (
    <>
      <form onSubmit={crear} className="card mb-6 flex flex-wrap gap-3 items-end">
        <input className="input-field max-w-[14rem]" placeholder="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
        <input className="input-field max-w-[7rem]" placeholder="ISO (UY)" value={iso} onChange={e => setIso(e.target.value)} />
        <input className="input-field max-w-[10rem]" placeholder="Programa (OEA)" value={programa} onChange={e => setPrograma(e.target.value)} />
        <button className="btn-primary text-sm px-4 py-2">Agregar país</button>
        {err && <p className="text-red-400 text-sm w-full">{err}</p>}
      </form>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 text-xs uppercase border-b border-navy-800">
            <th className="px-4 py-3">País</th><th className="px-4 py-3">ISO</th><th className="px-4 py-3">Programa</th></tr></thead>
          <tbody>
            {paises.map((p: any) => (
              <tr key={p.id} className="border-b border-navy-800/50 text-slate-300">
                <td className="px-4 py-2.5">{p.nombre}</td>
                <td className="px-4 py-2.5 font-mono">{p.codigo_iso}</td>
                <td className="px-4 py-2.5">{p.programa_oea || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

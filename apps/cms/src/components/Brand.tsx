// Marca da HS no painel: logo na tela de entrada e ícone no menu.
import React from 'react'

const plate: React.CSSProperties = { background: '#fff', borderRadius: 10, padding: '10px 16px', display: 'inline-block', lineHeight: 0 }

export const Logo = (): React.JSX.Element => (
  <span style={{ ...plate, padding: '10px 14px', border: '1px solid #e3e9ef' }}><img src="/logo.png" alt="HS Logística e Armazenagem" width={95} height={55} style={{ display: 'block', height: 'auto' }} /></span>
)
export const Icon = (): React.JSX.Element => (
  <span style={{ ...plate, padding: 3, borderRadius: 5 }}><img src="/logo.png" alt="HS" width={26} height={15} style={{ display: 'block' }} /></span>
)

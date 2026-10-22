import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadAll } from './data/store'
import { recompute } from './lib/calc'

const root = createRoot(document.getElementById('root')!)
root.render(<div style={{ padding: 40, fontFamily: 'var(--font-body)', color: 'hsl(var(--muted-foreground))' }}>Đang tải dữ liệu ngân quỹ…</div>)
loadAll()
  .then(() => { recompute(); root.render(<StrictMode><App /></StrictMode>) })
  .catch((e) => {
    console.error(e)
    root.render(<div style={{ padding: 40, fontFamily: 'var(--font-body)', color: 'hsl(var(--foreground))' }}>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>Không tải được dữ liệu</h2>
      <p style={{ marginTop: 8 }}>{String(e?.message || e)}. Tải lại trang (Ctrl+F5); nếu vẫn lỗi, kiểm tra các file trong thư mục data/ trên GitHub.</p>
    </div>)
  })

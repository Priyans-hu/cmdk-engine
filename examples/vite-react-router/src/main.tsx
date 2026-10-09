import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router'
import { Layout } from './layout'
import { pages } from './pages'
import './styles.css'

const router = createBrowserRouter([{ element: <Layout />, children: pages }])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

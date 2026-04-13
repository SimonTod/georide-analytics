import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './Layout.module.css'

export default function Layout() {
  const { email, logout } = useAuth()

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.logo}>GeoRide Enhanced</span>
        <nav className={styles.nav}>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? styles.active : ''}>
            Dashboard
          </NavLink>
          <NavLink to="/trips" className={({ isActive }) => isActive ? styles.active : ''}>
            Trajets
          </NavLink>
        </nav>
        <div className={styles.user}>
          <span className={styles.email}>{email}</span>
          <button onClick={logout} className={styles.logoutBtn}>Déconnexion</button>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

import { createBrowserRouter } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout'
import { AdminRoute } from '../modules/auth/AdminRoute'
import { CollaboratorRoute } from '../modules/auth/CollaboratorRoute'
import { HostRoute } from '../modules/auth/HostRoute'
import { ProtectedRoute } from '../modules/auth/ProtectedRoute'
import { UmlEditorRoute } from '../modules/auth/UmlEditorRoute'
import { AdminUsersPage } from '../pages/AdminUsersPage'
import { DashboardPage } from '../pages/DashboardPage'
import { HomePage } from '../pages/HomePage'
import { InvitationPage } from '../pages/InvitationPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProjectDetailPage } from '../pages/ProjectDetailPage'
import { ProjectParticipantsPage } from '../pages/ProjectParticipantsPage'
import { ProjectsPage } from '../pages/ProjectsPage'
import { SharedProjectsPage } from '../pages/SharedProjectsPage'
import { UmlEditorPage } from '../pages/UmlEditorPage'

export const router = createBrowserRouter([{ element: <MainLayout/>, children: [
  { path: '/', element: <HomePage/> }, { path: '/login', element: <LoginPage/> },
  { element: <ProtectedRoute/>, children: [
    { path: '/dashboard', element: <DashboardPage/> }, { path: '/invitations/:token', element: <InvitationPage/> },
    { element: <AdminRoute/>, children: [{ path: '/admin/users', element: <AdminUsersPage/> }] },
    { element: <HostRoute/>, children: [{ path: '/projects', element: <ProjectsPage/> }, { path: '/projects/:id', element: <ProjectDetailPage/> }, { path: '/projects/:id/participants', element: <ProjectParticipantsPage/> }] },
    { element: <CollaboratorRoute/>, children: [{ path: '/shared-projects', element: <SharedProjectsPage/> }] },
    { element: <UmlEditorRoute/>, children: [{ path: '/projects/:id/editor', element: <UmlEditorPage/> }] },
  ] }, { path: '*', element: <NotFoundPage/> },
] }])

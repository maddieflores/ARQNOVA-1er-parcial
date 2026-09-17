import { createBrowserRouter } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
export const router = createBrowserRouter([{ element: <MainLayout/>, children: [{ path: '/', element: <HomePage/> }, { path: '/login', element: <LoginPage/> }, { path: '/dashboard', element: <DashboardPage/> }, { path: '*', element: <NotFoundPage/> }] }]);

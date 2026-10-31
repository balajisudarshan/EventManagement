import '../styles/globals.css';
import { ThemeProvider } from '../src/context/ThemeContext';
import { AuthProvider } from '../src/context/AuthContext';
import { NotificationProvider } from '../src/context/NotificationContext';
import Layout from '../src/components/Layout';

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}


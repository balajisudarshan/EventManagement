import Head from 'next/head';
import '../styles/globals.css';
import { ThemeProvider } from '../src/context/ThemeContext';
import { AuthProvider } from '../src/context/AuthContext';
import { NotificationProvider } from '../src/context/NotificationContext';
import Layout from '../src/components/Layout';

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <Head>
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
      </Head>
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


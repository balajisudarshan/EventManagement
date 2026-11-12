import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../../src/context/AuthContext';
import TemplateStudio from '../../../src/components/editor/TemplateStudio';

export default function CreateTemplatePage() {
  const router = useRouter();
  const { user, isOrganizer, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !isOrganizer)) {
      router.push('/login?redirect=/organizer/templates/create');
    }
  }, [user, isOrganizer, loading]);

  if (!user || !isOrganizer) return null;

  return (
    <>
      <Head>
        <title>Create Certificate Template | CEMS</title>
      </Head>
      <TemplateStudio />
    </>
  );
}


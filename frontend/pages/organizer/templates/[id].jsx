import React, { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../../src/context/AuthContext';
import TemplateStudio from '../../../src/components/editor/TemplateStudio';

export default function EditTemplatePage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isOrganizer, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !isOrganizer)) {
      router.push('/login');
    }
  }, [user, isOrganizer, loading]);

  if (!user || !isOrganizer || !id) return null;

  return (
    <>
      <Head>
        <title>Edit Certificate Template | CEMS</title>
      </Head>
      <TemplateStudio templateId={id} />
    </>
  );
}


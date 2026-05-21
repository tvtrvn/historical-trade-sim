import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/layout/Card';
import { en } from '@/i18n/en';
import { apiEndpoints } from '@/lib/api/endpoints';
import { fadeUp } from '@/lib/motion/variants';

import { BuilderForm } from './BuilderForm';
import { LivePreview } from './LivePreview';
import { useBuilderStore, builderToScenarioIn, builderValidationErrors } from './builderState';

export function BuilderPage() {
  const navigate = useNavigate();
  const state = useBuilderStore();

  const errors = builderValidationErrors(state);

  const createMut = useMutation({
    mutationFn: () => apiEndpoints.createScenario(builderToScenarioIn(state)),
    onSuccess: (res) => navigate(`/results/${res.id}`),
  });

  useEffect(() => {
    document.title = `${state.name} · Build · ${en.brand}`;
  }, [state.name]);

  return (
    <div className="max-w-container mx-auto px-4 sm:px-6">
      <PageHeader
        eyebrow={en.builder.eyebrow}
        title={en.builder.title}
        subtitle="Configure your scenario on the left. The preview on the right updates as you type."
      />

      <Card padded variant="glass" className="mb-6 sm:mb-8 -mt-2">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-sm bg-aurum/10 text-aurum border border-DEFAULT grid place-items-center shrink-0">
            <Sparkles className="w-4 h-4" strokeWidth={1.6} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-h3 sm:text-h3 tracking-tight text-text-primary">
              {en.builder.intro.title}
            </h2>
            <p className="mt-1.5 text-text-secondary text-body leading-relaxed">
              {en.builder.intro.body}
            </p>
            <div className="mt-3 hidden sm:flex items-center gap-2 text-caption text-text-muted">
              <span className="px-2 h-6 rounded-xs bg-bg-surface-2 border border-DEFAULT inline-flex items-center">
                Tip
              </span>
              <span>Tap any “?” icon for a plain-English explanation of that field.</span>
            </div>
          </div>
        </div>
      </Card>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2"
      >
        <motion.div variants={fadeUp} className="lg:col-span-7">
          <BuilderForm />
        </motion.div>
        <motion.div variants={fadeUp} className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <LivePreview
              errors={errors}
              onRun={() => createMut.mutate()}
              running={createMut.isPending}
              error={createMut.error}
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

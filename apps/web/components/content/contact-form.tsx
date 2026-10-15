'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ContactMessageSchema, type ContactMessage } from '@repo/schemas';
import { Button } from '@repo/ui/button';
import { Input, Select, Textarea } from '@repo/ui/field';
import { api, ApiError } from '@/lib/api/client';

export function ContactForm() {
  const form = useForm<z_in, unknown, ContactMessage>({ resolver: zodResolver(ContactMessageSchema), mode: 'onTouched', defaultValues: { name: '', email: '', phone: '', topic: 'booking', message: '' } });
  const send = useMutation({ mutationFn: api.enquiries.contact });
  const { errors, touchedFields } = form.formState;
  const ok = (k: keyof ContactMessage) => !!touchedFields[k] && !errors[k];

  return (
    <AnimatePresence mode="wait">
      {send.isSuccess ? (
        <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-surface p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
          <p className="mt-4 font-display text-2xl font-extrabold">Message received</p>
          <p className="mt-2 text-fg-muted">Reference <span className="tabular font-semibold text-fg">{send.data.ref}</span>. We reply within one working day.</p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          exit={{ opacity: 0, y: -12 }}
          noValidate
          onSubmit={form.handleSubmit((d) => send.mutate(d, { onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Couldn’t send. Try again.') }))}
          className="space-y-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Name" autoComplete="name" error={errors.name?.message} valid={ok('name')} {...form.register('name')} />
            <Input type="email" label="Email" autoComplete="email" error={errors.email?.message} valid={ok('email')} {...form.register('email')} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Input type="tel" label="Mobile (optional)" prefix="+91" error={errors.phone?.message} {...form.register('phone')} />
            <Select label="Topic" options={[{ value: 'booking', label: 'A booking' }, { value: 'corporate', label: 'Corporate / planner account' }, { value: 'talent', label: 'I’m talent or a manager' }, { value: 'other', label: 'Something else' }]} {...form.register('topic')} />
          </div>
          <Textarea label="How can we help?" error={errors.message?.message} {...form.register('message')} />
          <Button type="submit" size="lg" disabled={send.isPending}>
            {send.isPending ? <><Loader2 className="animate-spin" aria-hidden /> Sending</> : 'Send message'}
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

type z_in = import('zod').input<typeof ContactMessageSchema>;

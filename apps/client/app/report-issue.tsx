import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Chip,
  HelperText,
  Text,
  TextInput,
} from 'react-native-paper';
import { issueSubmissionSchema } from '@mana-town/validation';
import { AppFooter } from '../src/AppFooter';
import { createIssue, getApiErrorMessage, getMyIssues } from '../src/api';
import { NatureBackdrop } from '../src/NatureBackdrop';
import { useLocationContext } from '../src/LocationContext';

type IssueForm = z.infer<typeof issueSubmissionSchema>;

const defaultValues: IssueForm = {
  title: '',
  description: '',
  category: '',
  locality: '',
};

const categories = ['roads', 'water', 'sanitation', 'electricity', 'other'];

export default function ReportIssueScreen() {
  const { t } = useTranslation();
  const { locality } = useLocationContext();
  const queryClient = useQueryClient();
  const [submittedReference, setSubmittedReference] = useState('');
  const form = useForm<IssueForm>({
    resolver: zodResolver(issueSubmissionSchema),
    defaultValues: { ...defaultValues, locality },
  });
  useEffect(() => {
    if (!form.getFieldState('locality').isDirty) {
      form.setValue('locality', locality);
    }
  }, [form, locality]);
  const reports = useQuery({
    queryKey: ['issues', 'mine'],
    queryFn: getMyIssues,
  });
  const submit = useMutation({
    mutationFn: createIssue,
    onSuccess: async (issue) => {
      setSubmittedReference(issue.reference);
      form.reset({ ...defaultValues, locality });
      await queryClient.invalidateQueries({ queryKey: ['issues', 'mine'] });
    },
  });

  const field = (name: keyof IssueForm, label: string, multiline = false) => (
    <Controller
      key={name}
      control={form.control}
      name={name}
      render={({ field: input, fieldState }) => (
        <View>
          <TextInput
            label={label}
            value={input.value ?? ''}
            onChangeText={input.onChange}
            onBlur={input.onBlur}
            multiline={multiline}
            error={Boolean(fieldState.error)}
            accessibilityLabel={label}
          />
          {fieldState.error && (
            <HelperText type="error" visible>
              {t('owner.validation.required')}
            </HelperText>
          )}
        </View>
      )}
    />
  );

  const error = submit.isError ? getApiErrorMessage(submit.error, t) : '';

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <NatureBackdrop />
      <View style={styles.content}>
        <Link href="/" asChild>
          <Button mode="text" icon="arrow-left">
            {t('nav.home')}
          </Button>
        </Link>
        <Text variant="headlineMedium" style={styles.heading}>
          {t('issue.title')}
        </Text>
        {field('title', t('issue.reportTitle'))}
        {field('description', t('issue.description'), true)}
        <Text variant="titleMedium">{t('issue.category')}</Text>
        <View style={styles.chips}>
          {categories.map((category) => (
            <Chip
              key={category}
              selected={form.watch('category') === category}
              onPress={() =>
                form.setValue('category', category, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            >
              {t(`issue.categories.${category}`)}
            </Chip>
          ))}
        </View>
        {form.formState.errors.category && (
          <Text style={styles.error}>{t('owner.validation.required')}</Text>
        )}
        {field('locality', t('issue.locality'))}
        {submittedReference ? (
          <Text accessibilityLiveRegion="polite" style={styles.success}>
            {t('issue.submitted')} {t('issue.reference')}: {submittedReference}
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <Button
          mode="contained"
          loading={submit.isPending}
          disabled={submit.isPending}
          onPress={form.handleSubmit((values) => {
            setSubmittedReference('');
            submit.mutate(values);
          })}
        >
          {t('issue.submit')}
        </Button>

        <Text variant="titleLarge">{t('issue.mine')}</Text>
        {reports.isPending && (
          <Text accessibilityRole="progressbar">{t('issue.loading')}</Text>
        )}
        {reports.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {getApiErrorMessage(reports.error, t)}
            </Text>
            <Button mode="outlined" onPress={() => void reports.refetch()}>
              {t('directory.retry')}
            </Button>
          </View>
        )}
        {reports.data?.length === 0 && <Text>{t('issue.empty')}</Text>}
        {reports.data?.map((issue) => (
          <Card key={issue.id} mode="elevated">
            <Card.Content style={styles.card}>
              <Text variant="titleMedium">{issue.title}</Text>
              <Text>
                {t('issue.reference')}: {issue.reference}
              </Text>
              <Text>
                {t(`issue.status.${issue.status}`, {
                  defaultValue: issue.status,
                })}
              </Text>
              <Text>
                {issue.locality} · {t(`issue.categories.${issue.category}`)}
              </Text>
              {issue.resolution && <Text>{issue.resolution}</Text>}
            </Card.Content>
          </Card>
        ))}
      </View>
      <AppFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    position: 'relative',
    flexGrow: 1,
    backgroundColor: 'transparent',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    gap: 14,
  },
  heading: {
    color: '#0B6B4F',
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    gap: 8,
  },
  state: {
    gap: 8,
  },
  error: {
    color: '#B42318',
  },
  success: {
    color: '#0B6B4F',
  },
});

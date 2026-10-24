import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Checkbox,
  HelperText,
  Text,
  TextInput,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { businessSubmissionSchema } from '@mana-town/validation';
import {
  createBusiness,
  getApiErrorMessage,
  getBusinessCategories,
  getOwnBusinesses,
  requestEntrepreneurClassification,
  submitBusiness,
  updateBusiness,
  type OwnedBusiness,
} from '../src/api';
import { useState } from 'react';
import { z } from 'zod';

type BusinessForm = z.infer<typeof businessSubmissionSchema>;

const emptyForm: BusinessForm = {
  name: '',
  description: '',
  categoryId: '',
  locality: 'Kadiri',
  address: '',
  phone: '',
  whatsapp: '',
};

export default function OwnerPortalScreen() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [confirmWomenOwned, setConfirmWomenOwned] = useState(false);
  const categories = useQuery({
    queryKey: ['business-categories'],
    queryFn: getBusinessCategories,
  });
  const businesses = useQuery({
    queryKey: ['businesses', 'mine'],
    queryFn: getOwnBusinesses,
  });
  const form = useForm<BusinessForm>({
    resolver: zodResolver(businessSubmissionSchema),
    defaultValues: emptyForm,
  });
  const save = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string | null;
      values: BusinessForm;
    }) => {
      const { phone, whatsapp, ...details } = values;
      const payload = {
        ...details,
        ...(phone ? { phone } : {}),
        ...(whatsapp ? { whatsapp } : {}),
      };
      return id ? updateBusiness(id, payload) : createBusiness(payload);
    },
    onSuccess: async (business: OwnedBusiness) => {
      setSelectedId(business.id);
      setFeedback(t('owner.saved'));
      await queryClient.invalidateQueries({ queryKey: ['businesses', 'mine'] });
    },
  });
  const submit = useMutation({
    mutationFn: submitBusiness,
    onSuccess: async () => {
      setFeedback(t('owner.submitted'));
      await queryClient.invalidateQueries({ queryKey: ['businesses', 'mine'] });
    },
  });
  const entrepreneurRequest = useMutation({
    mutationFn: requestEntrepreneurClassification,
    onSuccess: async () => {
      setFeedback(t('owner.classificationSubmitted'));
      setConfirmWomenOwned(false);
      await queryClient.invalidateQueries({ queryKey: ['businesses', 'mine'] });
    },
  });

  const edit = (business: OwnedBusiness) => {
    setFeedback('');
    setSelectedId(business.id);
    form.reset({
      name: business.name,
      description: business.description,
      categoryId: business.categories[0]?.id ?? '',
      locality: business.locality,
      address: business.address,
      phone: business.phone ?? '',
      whatsapp: business.whatsapp ?? '',
    });
  };

  const field = (
    name: keyof BusinessForm,
    label: string,
    multiline = false,
  ) => (
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
            error={Boolean(fieldState.error)}
            multiline={multiline}
            accessibilityLabel={label}
          />
          {fieldState.error && (
            <HelperText type="error" visible>
              {name === 'name'
                ? t('owner.validation.name')
                : name === 'description'
                  ? t('owner.validation.description')
                  : name === 'phone' || name === 'whatsapp'
                    ? t('owner.validation.contact')
                    : t('owner.validation.required')}
            </HelperText>
          )}
        </View>
      )}
    />
  );

  const saveFailed = save.isError
    ? getApiErrorMessage(save.error, t)
    : submit.isError
      ? getApiErrorMessage(submit.error, t)
      : entrepreneurRequest.isError
        ? getApiErrorMessage(entrepreneurRequest.error, t)
        : '';

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <Link href="/" asChild>
          <Button mode="text" icon="arrow-left">
            {t('nav.home')}
          </Button>
        </Link>
        <Text variant="headlineMedium" style={styles.heading}>
          {t('owner.title')}
        </Text>
        <Text variant="titleLarge">{t('owner.createTitle')}</Text>
        {field('name', t('owner.name'))}
        {field('description', t('owner.description'), true)}
        <Text variant="titleMedium">{t('owner.category')}</Text>
        {categories.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {getApiErrorMessage(categories.error, t)}
            </Text>
            <Button mode="outlined" onPress={() => void categories.refetch()}>
              {t('directory.retry')}
            </Button>
          </View>
        )}
        <View style={styles.chips}>
          {categories.data?.map((category) => (
            <Chip
              key={category.id}
              selected={form.watch('categoryId') === category.id}
              onPress={() =>
                form.setValue('categoryId', category.id, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            >
              {i18n.resolvedLanguage === 'te'
                ? category.nameTelugu
                : category.nameEnglish}
            </Chip>
          ))}
        </View>
        {form.formState.errors.categoryId && (
          <Text style={styles.error}>{t('owner.validation.required')}</Text>
        )}
        {field('locality', t('owner.locality'))}
        {field('address', t('owner.address'))}
        {field('phone', t('owner.phone'))}
        {field('whatsapp', t('owner.whatsapp'))}
        {feedback ? (
          <Text accessibilityLiveRegion="polite" style={styles.success}>
            {feedback}
          </Text>
        ) : null}
        {saveFailed ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {saveFailed}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button
            mode="contained"
            loading={save.isPending}
            disabled={save.isPending || submit.isPending}
            onPress={form.handleSubmit((values) => {
              setFeedback('');
              save.mutate({ id: selectedId, values });
            })}
          >
            {t('owner.save')}
          </Button>
          {selectedId && (
            <Button
              mode="outlined"
              onPress={() => {
                setSelectedId(null);
                setFeedback('');
                form.reset(emptyForm);
              }}
            >
              {t('owner.cancelEdit')}
            </Button>
          )}
        </View>

        <Text variant="titleLarge">{t('nav.businesses')}</Text>
        <Checkbox.Item
          label={t('owner.confirmWomenOwned')}
          status={confirmWomenOwned ? 'checked' : 'unchecked'}
          onPress={() => setConfirmWomenOwned((value) => !value)}
          position="leading"
        />
        {businesses.isPending && (
          <Text accessibilityRole="progressbar">{t('owner.loading')}</Text>
        )}
        {businesses.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {getApiErrorMessage(businesses.error, t)}
            </Text>
            <Button mode="outlined" onPress={() => void businesses.refetch()}>
              {t('directory.retry')}
            </Button>
          </View>
        )}
        {businesses.data?.length === 0 && <Text>{t('owner.empty')}</Text>}
        {businesses.data?.map((business) => (
          <Card key={business.id} mode="elevated">
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium">{business.name}</Text>
              <Text>
                {t(`owner.status.${business.status}`, {
                  defaultValue: business.status,
                })}
              </Text>
              {business.rejectionReason && (
                <Text>
                  {t('owner.rejection')}: {business.rejectionReason}
                </Text>
              )}
              {business.entrepreneur && (
                <Text>
                  {t(`owner.classification.${business.entrepreneur.status}`)}
                </Text>
              )}
              {business.entrepreneur?.rejectionReason && (
                <Text>
                  {t('owner.rejection')}:{' '}
                  {business.entrepreneur.rejectionReason}
                </Text>
              )}
            </Card.Content>
            <Card.Actions>
              {business.status !== 'SUSPENDED' && (
                <Button onPress={() => edit(business)}>
                  {t('owner.edit')}
                </Button>
              )}
              {(business.status === 'DRAFT' ||
                business.status === 'REJECTED') && (
                <Button
                  loading={submit.isPending}
                  disabled={submit.isPending}
                  onPress={() => {
                    setFeedback('');
                    submit.mutate(business.id);
                  }}
                >
                  {t('owner.submit')}
                </Button>
              )}
              {business.status === 'APPROVED' &&
                business.entrepreneur?.status !== 'APPROVED' &&
                business.entrepreneur?.status !== 'PENDING' && (
                  <Button
                    loading={entrepreneurRequest.isPending}
                    disabled={
                      entrepreneurRequest.isPending || !confirmWomenOwned
                    }
                    onPress={() => {
                      setFeedback('');
                      entrepreneurRequest.mutate(business.id);
                    }}
                  >
                    {t('owner.requestClassification')}
                  </Button>
                )}
            </Card.Actions>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: '#F8F9FA',
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
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  state: {
    gap: 8,
  },
  cardContent: {
    gap: 8,
  },
  error: {
    color: '#B42318',
  },
  success: {
    color: '#0B6B4F',
  },
});

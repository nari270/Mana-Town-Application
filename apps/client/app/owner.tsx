import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
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
  getBusinessViewStats,
  getOwnBusinesses,
  requestEntrepreneurClassification,
  submitBusiness,
  uploadBusinessImage,
  updateBusiness,
  type OwnedBusiness,
} from '../src/api';
import { useEffect, useState } from 'react';
import { z } from 'zod';
import { AppFooter } from '../src/AppFooter';
import { NatureBackdrop } from '../src/NatureBackdrop';
import { useLocationContext } from '../src/LocationContext';

type BusinessForm = z.infer<typeof businessSubmissionSchema>;

const emptyForm: BusinessForm = {
  name: '',
  description: '',
  categoryId: '',
  locality: '',
  address: '',
  phone: '',
  whatsapp: '',
};

export default function OwnerPortalScreen() {
  const { t, i18n } = useTranslation();
  const { locality } = useLocationContext();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<
    OwnedBusiness['status'] | null
  >(null);
  const [feedback, setFeedback] = useState('');
  const [latitudeInput, setLatitudeInput] = useState('');
  const [longitudeInput, setLongitudeInput] = useState('');
  const [locationError, setLocationError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [confirmWomenOwned, setConfirmWomenOwned] = useState(false);
  const categories = useQuery({
    queryKey: ['business-categories'],
    queryFn: getBusinessCategories,
  });
  const businesses = useQuery({
    queryKey: ['businesses', 'mine'],
    queryFn: getOwnBusinesses,
  });
  const viewStats = useQuery({
    queryKey: ['businesses', 'mine', 'stats'],
    queryFn: getBusinessViewStats,
  });
  const form = useForm<BusinessForm>({
    resolver: zodResolver(businessSubmissionSchema),
    defaultValues: { ...emptyForm, locality },
  });
  useEffect(() => {
    if (!selectedId && !form.getFieldState('locality').isDirty) {
      form.setValue('locality', locality);
    }
  }, [form, locality, selectedId]);
  const save = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string | null;
      values: BusinessForm;
    }) => {
      if (!values.coordinates) {
        throw new Error(t('owner.locationInvalid'));
      }
      const { phone, whatsapp, coordinates, ...details } = values;
      const payload = {
        ...details,
        coordinates,
        ...(phone ? { phone } : {}),
        ...(whatsapp ? { whatsapp } : {}),
      };
      return id ? updateBusiness(id, payload) : createBusiness(payload);
    },
    onSuccess: async (business: OwnedBusiness) => {
      setSelectedId(business.id);
      setSelectedStatus(business.status);
      setFeedback(t('owner.saved'));
      await queryClient.invalidateQueries({ queryKey: ['businesses', 'mine'] });
    },
  });
  const submit = useMutation({
    mutationFn: submitBusiness,
    onSuccess: async (_, businessId) => {
      if (businessId === selectedId) setSelectedStatus('PENDING');
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
    setLocationError('');
    setPhotoError('');
    setSelectedId(business.id);
    setSelectedStatus(business.status);
    form.reset({
      name: business.name,
      description: business.description,
      categoryId: business.categories[0]?.id ?? '',
      locality: business.locality,
      address: business.address,
      coordinates:
        business.latitude !== null && business.longitude !== null
          ? {
              latitude: business.latitude,
              longitude: business.longitude,
            }
          : undefined,
      phone: business.phone ?? '',
      whatsapp: business.whatsapp ?? '',
    });
    setLatitudeInput(
      business.latitude === null ? '' : String(business.latitude),
    );
    setLongitudeInput(
      business.longitude === null ? '' : String(business.longitude),
    );
  };

  const useCurrentLocation = async () => {
    setLocationError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError(t('owner.locationDenied'));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLatitudeInput(String(position.coords.latitude));
      setLongitudeInput(String(position.coords.longitude));
      form.setValue('coordinates', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setLocationError(t('owner.locationError'));
    }
  };

  const saveDraft = () => {
    const latitude = Number(latitudeInput);
    const longitude = Number(longitudeInput);
    if (
      !latitudeInput.trim() ||
      !longitudeInput.trim() ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setLocationError(t('owner.locationInvalid'));
      return;
    }
    setLocationError('');
    form.setValue('coordinates', { latitude, longitude });
    void form.handleSubmit((values) => {
      setFeedback('');
      save.mutate({
        id: selectedId,
        values: { ...values, coordinates: { latitude, longitude } },
      });
    })();
  };

  const takeBusinessPhoto = async () => {
    if (!selectedId) {
      setPhotoError(t('owner.photoSaveFirst'));
      return;
    }
    setPhotoError('');
    setPhotoUploading(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPhotoError(t('owner.cameraDenied'));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      if (!response.ok) {
        setPhotoError(t('owner.photoUploadError'));
        return;
      }
      const image = await response.blob();
      const typedImage = new Blob([image], {
        type: asset.mimeType ?? image.type,
      });
      const formData = new FormData();
      formData.append(
        'file',
        typedImage,
        asset.fileName ?? 'business-photo.jpg',
      );
      formData.append('altText', form.getValues('name'));
      await uploadBusinessImage(selectedId, formData);
      await queryClient.invalidateQueries({ queryKey: ['businesses', 'mine'] });
      setFeedback(t('owner.photoUploaded'));
    } catch (error) {
      setPhotoError(getApiErrorMessage(error, t));
    } finally {
      setPhotoUploading(false);
    }
  };

  const field = (
    name: Exclude<keyof BusinessForm, 'coordinates'>,
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
      <NatureBackdrop />
      <View style={styles.content}>
        <Link href="/" asChild>
          <Button mode="text" icon="arrow-left">
            {t('nav.home')}
          </Button>
        </Link>
        <Text variant="headlineMedium" style={styles.heading}>
          {t('owner.title')}
        </Text>
        <Text variant="titleLarge">{t('ownerStats.title')}</Text>
        {viewStats.data?.length === 0 && <Text>{t('ownerStats.empty')}</Text>}
        {viewStats.data?.map((stat) => (
          <Card key={stat.id} mode="outlined">
            <Card.Content style={styles.state}>
              <Text variant="titleMedium">{stat.name}</Text>
              <Text>
                {t('ownerStats.totalViews')}: {stat.totalViews} ·{' '}
                {t('ownerStats.uniqueViewers')}: {stat.uniqueViewers} ·{' '}
                {t('ownerStats.last7Days')}: {stat.viewsLast7Days}
              </Text>
            </Card.Content>
          </Card>
        ))}
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
        <View style={styles.locationFields}>
          <Text variant="titleMedium">{t('owner.locationTitle')}</Text>
          <Text variant="bodySmall" style={styles.hint}>
            {t('owner.locationHint')}
          </Text>
          <View style={styles.coordinates}>
            <TextInput
              label={t('owner.latitude')}
              value={latitudeInput}
              onChangeText={setLatitudeInput}
              keyboardType="numbers-and-punctuation"
              style={styles.coordinateInput}
            />
            <TextInput
              label={t('owner.longitude')}
              value={longitudeInput}
              onChangeText={setLongitudeInput}
              keyboardType="numbers-and-punctuation"
              style={styles.coordinateInput}
            />
          </View>
          <Button
            mode="outlined"
            icon="crosshairs-gps"
            onPress={() => void useCurrentLocation()}
          >
            {t('owner.useCurrentLocation')}
          </Button>
        </View>
        {locationError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {locationError}
          </Text>
        ) : null}
        {selectedId &&
        (selectedStatus === 'DRAFT' || selectedStatus === 'REJECTED') ? (
          <View style={styles.photoActions}>
            <Button
              mode="outlined"
              icon="camera-outline"
              loading={photoUploading}
              disabled={
                photoUploading ||
                (businesses.data?.find((business) => business.id === selectedId)
                  ?.images.length ?? 0) >= 5
              }
              onPress={() => void takeBusinessPhoto()}
            >
              {t('owner.addPhoto')}
            </Button>
            <Text variant="bodySmall" style={styles.hint}>
              {(businesses.data?.find((business) => business.id === selectedId)
                ?.images.length ?? 0) >= 5
                ? t('owner.photoLimitReached')
                : t('owner.photoLimit')}
            </Text>
          </View>
        ) : selectedId ? (
          <Text variant="bodySmall" style={styles.hint}>
            {t('owner.photoDraftOnly')}
          </Text>
        ) : (
          <Text variant="bodySmall" style={styles.hint}>
            {t('owner.photoSaveFirst')}
          </Text>
        )}
        {photoError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {photoError}
          </Text>
        ) : null}
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
            onPress={saveDraft}
          >
            {t('owner.save')}
          </Button>
          {selectedId && (
            <Button
              mode="outlined"
              onPress={() => {
                setSelectedId(null);
                setSelectedStatus(null);
                setFeedback('');
                setLatitudeInput('');
                setLongitudeInput('');
                setLocationError('');
                setPhotoError('');
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
              {business.images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.businessPhotos}>
                    {business.images.map((image) => (
                      <Image
                        key={image.id}
                        source={{ uri: image.imageUrl }}
                        style={styles.businessPhoto}
                        accessibilityLabel={image.altText}
                      />
                    ))}
                  </View>
                </ScrollView>
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
  locationFields: {
    gap: 8,
  },
  coordinates: {
    flexDirection: 'row',
    gap: 8,
  },
  coordinateInput: {
    flex: 1,
  },
  photoActions: {
    gap: 8,
    alignItems: 'flex-start',
  },
  businessPhotos: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  businessPhoto: {
    width: 110,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#E6EFE8',
  },
  hint: {
    color: '#70847B',
  },
  error: {
    color: '#B42318',
  },
  success: {
    color: '#0B6B4F',
  },
});

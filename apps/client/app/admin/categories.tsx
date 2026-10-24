import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import {
  createAdminCategory,
  getApiErrorMessage,
  getAdminCategories,
  updateAdminCategory,
  type AdminCategory,
} from '../../src/api';
import { AppFooter } from '../../src/AppFooter';
import { NatureBackdrop } from '../../src/NatureBackdrop';

export default function AdminCategoriesScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameEnglish, setNameEnglish] = useState('');
  const [nameTelugu, setNameTelugu] = useState('');
  const [slug, setSlug] = useState('');
  const [feedback, setFeedback] = useState('');
  const categories = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: getAdminCategories,
  });
  const save = useMutation({
    mutationFn: (input: Omit<AdminCategory, 'id'>) =>
      editingId
        ? updateAdminCategory(editingId, input)
        : createAdminCategory(input),
    onSuccess: async () => {
      setFeedback(t('owner.saved'));
      setEditingId(null);
      setNameEnglish('');
      setNameTelugu('');
      setSlug('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] }),
        queryClient.invalidateQueries({ queryKey: ['business-categories'] }),
      ]);
    },
  });
  const formValid =
    nameEnglish.trim().length >= 2 &&
    nameTelugu.trim().length >= 2 &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

  const edit = (category: AdminCategory) => {
    setEditingId(category.id);
    setNameEnglish(category.nameEnglish);
    setNameTelugu(category.nameTelugu);
    setSlug(category.slug);
    setFeedback('');
  };

  const error = save.isError ? getApiErrorMessage(save.error, t) : '';

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <NatureBackdrop />
      <View style={styles.content}>
        <Link href="/admin" asChild>
          <Button mode="text" icon="arrow-left">
            {t('admin.title')}
          </Button>
        </Link>
        <Text variant="headlineMedium" style={styles.heading}>
          {t('adminCategories.title')}
        </Text>
        <TextInput
          label={t('adminCategories.englishName')}
          value={nameEnglish}
          onChangeText={setNameEnglish}
        />
        <TextInput
          label={t('adminCategories.teluguName')}
          value={nameTelugu}
          onChangeText={setNameTelugu}
        />
        <TextInput
          label={t('adminCategories.slug')}
          value={slug}
          onChangeText={setSlug}
          autoCapitalize="none"
        />
        <View style={styles.actions}>
          <Button
            mode="contained"
            loading={save.isPending}
            disabled={!formValid || save.isPending}
            onPress={() =>
              save.mutate({
                nameEnglish: nameEnglish.trim(),
                nameTelugu: nameTelugu.trim(),
                slug,
              })
            }
          >
            {editingId
              ? t('adminCategories.save')
              : t('adminCategories.create')}
          </Button>
          {editingId && (
            <Button
              onPress={() => {
                setEditingId(null);
                setNameEnglish('');
                setNameTelugu('');
                setSlug('');
              }}
            >
              {t('owner.cancelEdit')}
            </Button>
          )}
        </View>
        {feedback ? (
          <Text accessibilityLiveRegion="polite" style={styles.success}>
            {feedback}
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {categories.isError && (
          <View style={styles.state}>
            <Text accessibilityRole="alert" style={styles.error}>
              {t('common.error')}
            </Text>
            <Button mode="outlined" onPress={() => void categories.refetch()}>
              {t('admin.retry')}
            </Button>
          </View>
        )}
        {categories.data?.length === 0 && (
          <Text>{t('adminCategories.empty')}</Text>
        )}
        {categories.data?.map((category) => (
          <Card key={category.id} mode="elevated">
            <Card.Content style={styles.card}>
              <Text variant="titleMedium">{category.nameEnglish}</Text>
              <Text>{category.nameTelugu}</Text>
              <Text>{category.slug}</Text>
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => edit(category)}>
                {t('adminCategories.edit')}
              </Button>
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
  actions: {
    flexDirection: 'row',
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

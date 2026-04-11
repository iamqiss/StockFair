import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  FlatList,
  Modal,
  ImageBackground,
  Image,
} from 'react-native';
import Icon from '@/components/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useStokvel } from '@/context/StokvelContext';
import { MarketplaceCard, MarketplaceGridCard } from '@/components/MarketplaceCard';
import { MARKETPLACE_PRODUCTS, CATEGORIES, RETAILERS } from '@/constants/marketplace';

export default function MarketplaceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { items, total, itemCount, clearCart } = useCart();
  const { addTransaction } = useStokvel();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCart, setShowCart] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const filtered = useMemo(() => {
    return MARKETPLACE_PRODUCTS.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.retailer.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [search, selectedCategory]);

  const handleCheckout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTransaction({
      type: 'marketplace',
      amount: total,
      date: new Date().toISOString(),
      description: 'Marketplace Order',
      status: 'paid',
    });
    clearCart();
    setOrderConfirmed(true);
    setTimeout(() => {
      setShowCart(false);
      setOrderConfirmed(false);
    }, 2000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 + bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <ImageBackground
          source={require('../../assets/images/grocery_hero.png')}
          style={[styles.header, { paddingTop: topPadding + 16 }]}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.95)']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />

          <Text style={styles.headerTitle}>{t('marketplace')}</Text>
          <Text style={styles.headerSubtitle}>Bulk deals for your stokvel</Text>

          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <Icon name="search" size={18} color="rgba(255,255,255,0.7)" />
            <TextInput
              style={styles.searchInput}
              placeholder={`${t('search')} products...`}
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="x" size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>
        </ImageBackground>

        {/* Partners */}
        <View style={styles.partnersSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('partners')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.partnersScroll}>
            {RETAILERS.map((r) => (
              <TouchableOpacity
                key={r.name}
                style={[styles.retailerChip, { backgroundColor: r.color + '12', borderColor: r.color + '35' }]}
                onPress={() => setSearch(r.name)}
              >
                <Image source={r.logo} style={styles.retailerLogo} resizeMode="contain" />
                <Text style={[styles.retailerChipName, { color: r.color }]}>{r.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll} contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4 }}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedCategory === cat ? colors.primary : colors.card,
                  borderColor: selectedCategory === cat ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryChipText, { color: selectedCategory === cat ? '#fff' : colors.mutedForeground }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Products header + view toggle */}
        <View style={styles.productsHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Products</Text>
            <Text style={[styles.productCount, { color: colors.mutedForeground }]}>{filtered.length} deals available</Text>
          </View>
          <View style={[styles.viewToggle, { backgroundColor: colors.muted }]}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'grid' && { backgroundColor: colors.card }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewMode('grid'); }}
            >
              <Icon name="grid" size={16} color={viewMode === 'grid' ? colors.foreground : colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'list' && { backgroundColor: colors.card }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewMode('list'); }}
            >
              <Icon name="list" size={16} color={viewMode === 'list' ? colors.foreground : colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Products */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="package" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No products found</Text>
          </View>
        ) : viewMode === 'grid' ? (
          <View style={styles.gridContainer}>
            {filtered.map((product) => (
              <MarketplaceGridCard key={product.id} product={product} />
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            {filtered.map((product) => (
              <MarketplaceCard key={product.id} product={product} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Pre-Orders FAB */}
      {itemCount > 0 && (
        <TouchableOpacity
          style={[styles.cartFab, { backgroundColor: colors.primary }]}
          onPress={() => setShowCart(true)}
        >
          <Icon name="clock" size={20} color={colors.primaryForeground} />
          <Text style={[styles.cartFabText, { color: colors.primaryForeground }]}>
            {itemCount} pre-order{itemCount !== 1 ? 's' : ''} · R {total.toLocaleString('en-ZA')}
          </Text>
          <View style={[styles.cartBadge, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Text style={[styles.cartBadgeText, { color: colors.primaryForeground }]}>{itemCount}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Pre-Orders Modal */}
      <Modal visible={showCart} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.cartModal, { backgroundColor: colors.background }]}>
          <View style={styles.cartHeader}>
            <Text style={[styles.cartTitle, { color: colors.foreground }]}>Group Pre-Orders ({itemCount})</Text>
            <TouchableOpacity onPress={() => setShowCart(false)}>
              <Icon name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {orderConfirmed ? (
            <View style={styles.successState}>
              <View style={[styles.successIcon, { backgroundColor: colors.success + '20' }]}>
                <Icon name="check-circle" size={48} color={colors.success} />
              </View>
              <Text style={[styles.successTitle, { color: colors.foreground }]}>Pre-Order Placed!</Text>
              <Text style={[styles.successDesc, { color: colors.mutedForeground }]}>Your stokvel group will be notified.</Text>
            </View>
          ) : (
            <>
              <ScrollView style={{ flex: 1 }}>
                {items.map((item) => (
                  <View key={item.id} style={[styles.cartItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.cartItemIcon, { backgroundColor: colors.muted }]}>
                      <Icon name="package" size={20} color={colors.mutedForeground} />
                    </View>
                    <View style={styles.cartItemInfo}>
                      <Text style={[styles.cartItemName, { color: colors.foreground }]}>{item.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.cartItemRetailer, { color: colors.mutedForeground }]}>{item.retailer}</Text>
                        {item.stokvelName ? (
                          <View style={[styles.cartGroupBadge, { backgroundColor: colors.muted }]}>
                            <Icon name="users" size={9} color={colors.mutedForeground} />
                            <Text style={[styles.cartGroupBadgeText, { color: colors.mutedForeground }]}>{item.stokvelName}</Text>
                          </View>
                        ) : null}
                      </View>
                      {item.quantity > 1 && (
                        <Text style={[styles.cartItemQty, { color: colors.mutedForeground }]}>× {item.quantity}</Text>
                      )}
                    </View>
                    <Text style={[styles.cartItemPrice, { color: colors.foreground }]}>
                      R {(item.price * item.quantity).toLocaleString('en-ZA')}
                    </Text>
                  </View>
                ))}
              </ScrollView>

              <View style={[styles.cartFooter, { borderTopColor: colors.border }]}>
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>{t('total')}</Text>
                  <Text style={[styles.totalAmount, { color: colors.foreground }]}>R {total.toLocaleString('en-ZA')}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
                  onPress={handleCheckout}
                >
                  <Icon name="clock" size={18} color={colors.primaryForeground} />
                  <Text style={[styles.checkoutText, { color: colors.primaryForeground }]}>Confirm Group Pre-Orders</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 10,
    minHeight: 200,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  partnersSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Inter_700Bold',
  },
  partnersScroll: {
    flexDirection: 'row',
  },
  retailerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 10,
  },
  retailerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  retailerIconText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  retailerChipName: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoriesScroll: {
    marginBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  productCount: {
    fontSize: 11,
    marginTop: 2,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  viewToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 12,
    justifyContent: 'space-between',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
  },
  cartFab: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cartFabText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  cartBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cartModal: {
    flex: 1,
    padding: 24,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cartTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  cartItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  cartItemRetailer: {
    fontSize: 12,
  },
  cartGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cartGroupBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cartItemQty: {
    fontSize: 11,
    marginTop: 2,
  },
  cartItemPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  cartFooter: {
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 14,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  checkoutText: {
    fontSize: 16,
    fontWeight: '700',
  },
  successState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  successDesc: {
    fontSize: 15,
  },
});

import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Icon from "@/components/Icon";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

const SCREEN_W  = Dimensions.get("window").width;
const H_INSET    = Math.max(Math.round(SCREEN_W * 0.06), 16);
const TAB_HEIGHT = 64;

type TabIconProps = {
  name: string;
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
  isCenter?: boolean;
  centerColor?: string;
};

function TabIcon({ name, focused, activeColor, inactiveColor, isCenter, centerColor }: TabIconProps) {
  if (isCenter) {
    return (
      <View style={[styles.centerPill, { backgroundColor: focused ? centerColor : centerColor + 'CC' }]}>
        <Icon name={name} size={20} color="#FFFFFF" />
      </View>
    );
  }
  return (
    <View style={[styles.iconPill, focused && { backgroundColor: activeColor + '20' }]}>
      <Icon name={name} size={20} color={focused ? activeColor : inactiveColor} />
    </View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const isWeb  = Platform.OS === "web";
  const bottom = isWeb ? 16 : Math.max(insets.bottom, 6) + 12;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "600",
          letterSpacing: 0.1,
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarStyle: {
          position: "absolute",
          bottom,
          left: H_INSET,
          right: H_INSET,
          height: TAB_HEIGHT,
          borderRadius: TAB_HEIGHT / 2,
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.22,
          shadowRadius: 16,
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: Platform.OS === "android" ? 4 : 2,
          paddingBottom: Platform.OS === "android" ? 4 : 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} activeColor={colors.tabActive} inactiveColor={colors.tabInactive} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: t("groups"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="users" focused={focused} activeColor={colors.tabActive} inactiveColor={colors.tabInactive} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarLabel: "Discover",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="compass"
              focused={focused}
              activeColor={colors.tabActive}
              inactiveColor={colors.tabInactive}
              isCenter
              centerColor={colors.primary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="marketplace"
        options={{
          title: t("marketplace"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="shopping-bag" focused={focused} activeColor={colors.tabActive} inactiveColor={colors.tabInactive} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="user" focused={focused} activeColor={colors.tabActive} inactiveColor={colors.tabInactive} />
          ),
        }}
      />
      <Tabs.Screen name="transactions" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    width: 38,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  centerPill: {
    width: 44,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
});

declare module 'react' {
  export function useState<T>(initial: T): [T, (value: T) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
}

declare module 'react-native' {
  export interface ViewProps {
    children?: React.ReactNode;
    style?: any;
  }
  export const View: React.ComponentType<ViewProps>;
  
  export interface TextProps {
    children?: React.ReactNode;
    style?: any;
  }
  export const Text: React.ComponentType<TextProps>;
  
  export interface SwitchProps {
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    trackColor?: { false?: string; true?: string };
    thumbColor?: string;
  }
  export const Switch: React.ComponentType<SwitchProps>;
  
  export interface ScrollViewProps {
    children?: React.ReactNode;
    style?: any;
    showsVerticalScrollIndicator?: boolean;
  }
  export const ScrollView: React.ComponentType<ScrollViewProps>;
  
  export interface SafeAreaViewProps {
    children?: React.ReactNode;
    style?: any;
  }
  export const SafeAreaView: React.ComponentType<SafeAreaViewProps>;
  
  export interface TouchableOpacityProps {
    children?: React.ReactNode;
    style?: any;
    onPress?: () => void;
  }
  export const TouchableOpacity: React.ComponentType<TouchableOpacityProps>;
  
  export const StyleSheet: {
    create: (styles: any) => any;
  };
}

declare module 'expo-router' {
  export function useRouter(): {
    push: (path: string) => void;
    back: () => void;
  };
}

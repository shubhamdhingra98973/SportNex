import { Button, Text, View, TextInput } from 'react-native';
import React, { useState } from 'react';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { ScaledSheet } from 'react-native-size-matters';
import { Colors } from '@global';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from "@react-navigation/stack";
import {RootStackParamList} from '@navigation/types';

type NavProp = StackNavigationProp<RootStackParamList, "LoginRegisterScreen">;

const LoginRegisterScreen = () => {
  const safeAreaInsets = useSafeAreaInsets();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation<NavProp>();
  // const { login, register } = useAuth();

  async function submit() {
    if (mode === 'login') {
      // await login(username, password);
    } else {
      // await register(username, password);
    }
    navigation.navigate("DashboardScreen" , {token : "CXCcsddsd"});

  }
  return (
    <View style={styles.container}>
      <SafeAreaView
        style={{ paddingTop: safeAreaInsets.top, paddingHorizontal: 20 }}
      >
        <Text style={styles.textHeading}>SportsNex</Text>
        <View style={styles.upperContainer}>
          {mode === 'register' && (
            <TextInput
              placeholder="Name"
              value={name}
              onChangeText={setName}
              style={styles.txtInptStyles}
            />
          )}
          <TextInput
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.txtInptStyles}
          />
          <TextInput
            placeholder="Password"
            value={password}
            secureTextEntry
            onChangeText={setPassword}
            style={styles.txtInputPwdStyles}
          />
          <View style={styles.btnStyles}>
            <Button
              color={Colors.white}
              title={mode === 'login' ? 'Login' : 'Register'}
              onPress={submit}
            />
          </View>
          <Text
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={styles.registerTextStyes}
          >
            {mode === 'login'
              ? 'Need an account? Register'
              : 'Already have an account? Login'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = ScaledSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  upperContainer: {
    textAlign: 'center',
    justifyContent: 'center',
  },

  btnStyles: {
    marginTop: '40@vs',
    height: '50@vs',
    color: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryBlue,
    borderRadius: '5@s',
    marginHorizontal: '20@s',
  },

  registerTextStyes: { textAlign: 'center', color: 'blue', marginTop: '10@vs' },

  txtInptStyles: {
    borderWidth: '1@s',
    marginTop: '30@vs',
    height: '50@vs',
    padding: '10@s',
    borderRadius: '5@s',
    fontSize: '18@ms',
  },

  txtInputPwdStyles: {
    borderWidth: '1@s',
    marginTop: '24@vs',
    height: '50@vs',
    padding: '10@ms',
    borderRadius: '5@s',
    fontSize: '18@ms',
  },

  textHeading: { fontSize: '24@ms', fontWeight: 'bold', textAlign: 'center' },
});

export default LoginRegisterScreen;

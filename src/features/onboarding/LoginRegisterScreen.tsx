import { Button, Text, View, TextInput, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { ScaledSheet } from 'react-native-size-matters';
import { Colors, generateNewObjectId, getCurrentTimeMilliSeconds } from '@global';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from '@navigation/types';
import { useDispatch } from 'react-redux';
import UserRepository from '@storage/sqlite/repository/UserRepository';
import { login} from '@storage/redux/actions/userActions';
import { saveAuthState } from '@storage/authStorage';

type NavProp = StackNavigationProp<RootStackParamList, "LoginRegisterScreen">;

const LoginRegisterScreen = () => {
  const safeAreaInsets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation<NavProp>();

  const validateInputs = (): boolean => {
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    if (!password.trim()) {
      setError('Password is required');
      return false;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Name is required');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    return true;
  };

  async function submit() {
    setError('');

    if (!validateInputs()) {
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        // Login logic
        const user = await UserRepository.loginUser(username.trim(), password);

        if (user) {
          // Generate a simple token (in production, use proper JWT or similar)
          const token = `token_${user.id}_${Date.now()}`;

          // Dispatch login action
          dispatch(login(token, user.id?.toString() || '', 'user', user.name?.toString()));

          // Save auth state to AsyncStorage
          await saveAuthState({
            loggedInToken: token,
            loggedInUser_ID: user.id?.toString() || '',
            loggedInRole: 'user',
            loggedInName: user.name || '',
          });

          // Navigate to dashboard
          navigation.navigate("DashboardScreen", { token });
        } else {
          setError('Invalid username or password');
        }
      } else {
        // Register logic
        const usernameExists = await UserRepository.checkUsernameExists(
          username.trim(),
        );

        if (usernameExists) {
          setError('Username already exists. Please choose a different one.');
          setLoading(false);
          return;
        }

        const user = await UserRepository.registerUser({
          id: generateNewObjectId(),
          name: name.trim(),
          username: username.trim(),
          password: password.trim(),
          created_at: getCurrentTimeMilliSeconds()
        });

        if (user) {
          // Generate a simple token
          const token = `token_${user.id}_${Date.now()}`;

          // Dispatch register action
          dispatch(login(token, user.id?.toString() || '', 'user', user.name?.toString()));

          // Save auth state to AsyncStorage
          await saveAuthState({
            loggedInToken: token,
            loggedInUser_ID: user.id?.toString() || '',
            loggedInRole: 'user',
            loggedInName: user.name || '',
          });

          // Show success message
          Alert.alert('Success', 'Registration successful!', [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to dashboard
                navigation.navigate("DashboardScreen", { token });
              },
            },
          ]);
        } else {
          setError('Registration failed. Please try again.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setName('');
    setUsername('');
    setPassword('');
    setShowPassword(false);
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
              onChangeText={(text) => {
                setName(text);
                setError('');
              }}
              style={styles.txtInptStyles}
              editable={!loading}
            />
          )}
          <TextInput
            placeholder="Username"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setError('');
            }}
            style={styles.txtInptStyles}
            editable={!loading}
            autoCapitalize="none"
          />
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Password"
              value={password}
              secureTextEntry={!showPassword}
              onChangeText={(text) => {
                setPassword(text);
                setError('');
              }}
              style={styles.txtInputPwdStyles}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              disabled={loading}
            >
              <Text style={styles.eyeButtonText}>{showPassword ? '👁️' : '👁'}</Text>
            </TouchableOpacity>
          </View>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}
          <View style={styles.btnStyles}>
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Button
                color={Colors.white}
                title={mode === 'login' ? 'Login' : 'Register'}
                onPress={submit}
                disabled={loading}
              />
            )}
          </View>
          <Text
            onPress={switchMode}
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

  registerTextStyes: { 
    textAlign: 'center', 
    color: 'blue',
    marginTop: '10@vs'
  },

  errorText: {
    color: 'red',
    fontSize: '14@ms',
    marginTop: '10@vs',
    textAlign: 'center',
    marginHorizontal: '20@s',
  },

  txtInptStyles: {
    borderWidth: '1@s',
    marginTop: '30@vs',
    height: '50@vs',
    padding: '10@s',
    borderRadius: '5@s',
    fontSize: '18@ms',
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: '1@s',
    marginTop: '24@vs',
    height: '50@vs',
    borderRadius: '5@s',
    backgroundColor: Colors.white,
  },
  txtInputPwdStyles: {
    flex: 1,
    padding: '10@ms',
    fontSize: '18@ms',
    borderWidth: 0,
  },
  eyeButton: {
    padding: '10@s',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeButtonText: {
    fontSize: '20@ms',
  },

  textHeading: { 
    fontSize: '24@ms',
    fontWeight: 'bold',
    textAlign: 'center'
  },

});

export default LoginRegisterScreen;

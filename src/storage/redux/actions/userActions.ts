import {IUserAction} from '@storage/redux/actions/user.types';
import * as type from '../constants/ActionTypes';


export const login: IUserAction['login'] = (
    loggedInToken,
    loggedInUser_ID,
    loggedInRole,
    loggedInName
  ) => {
    return {
      type: type.LOGIN,
      loggedInToken,
      loggedInUser_ID,
      loggedInRole,
      loggedInName
    };
  };

export const register: IUserAction['register'] = (
    loggedInToken,
    loggedInUser_ID,
    loggedInRole,
    loggedInName
  ) => {
    return {
      type: type.REGISTER,
      loggedInToken,
      loggedInUser_ID,
      loggedInRole,
      loggedInName
    };
  };

export const logout: IUserAction['logout'] = () => {
    return {
      type: type.LOGOUT,
    };
  };
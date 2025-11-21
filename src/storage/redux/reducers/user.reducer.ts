import { IUserState } from "@global/types"
import {AnyAction} from 'redux';
import * as type from '../constants/ActionTypes';

const initialState : IUserState =  {
    loggedInToken: '',
    loggedInUser_ID: '',
    loggedInRole: '',
    loggedInName: '',
}

const user =  (state = initialState, action : AnyAction) => {
switch (action.type) {
    case type.LOGIN:
    case type.REGISTER:
        return {
          ...state,
          loggedInToken: action.loggedInToken,
          loggedInUser_ID: action.loggedInUser_ID,
          loggedInRole: action.loggedInRole,
          loggedInName : action.loggedInName
        };
    case type.LOGOUT:
        return {
          ...initialState,
        };
    default:
        return state;
    }
};

export default user;
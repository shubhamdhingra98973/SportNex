/**
 * Created by rf1804
 *
 * @format
 */

import {combineReducers, Reducer} from 'redux';
import user from '@storage/redux/reducers/user.reducer'
import {
  IUserState,
} from '@global/types';

export interface IRootState {
  user: IUserState;
}

const rootReducer: Reducer<IRootState> = combineReducers({
  user
});

export default rootReducer;

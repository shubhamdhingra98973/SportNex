import { IUserState } from '@global/types';
import {legacy_createStore} from 'redux';
import rootReducer from '@storage/redux/reducers/rootReducer';

export interface IRootState {
    user: IUserState;
}
export default function configureStore(initialState = {}) {
    const store = legacy_createStore(
      rootReducer,
      initialState,
    );
    return store;
  }

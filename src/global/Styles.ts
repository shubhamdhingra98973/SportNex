import {ScaledSheet} from 'react-native-size-matters';

import Colors from './Colors';

//For TextAlign, fontFamily check src/redux/reducers/user.ts

export default ScaledSheet.create({
  // spinnerAnimationType: 'fade', //Anyone of these-> none, slide, fade
  container: {
    flex: 1,
    backgroundColor : Colors.white
  },
});
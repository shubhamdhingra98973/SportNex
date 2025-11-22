import React, { useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import type { KeyboardTypeOptions, StyleProp, TextStyle } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { Colors, getCurrentTimeMilliSeconds } from '@global'
import { ScaledSheet } from 'react-native-size-matters'
import EventRepository from '@storage/sqlite/repository/EventRepository'
import type { EventSchema } from '@storage/sqlite/schema/EventSchema'
import { useSelector } from 'react-redux'
import type { IRootState } from '@storage/redux/configureStore'
import type { RootStackParamList } from '@navigation/types'

type EventFormState = {
  eventName: string
  description: string
  maxPlayers: string
  dateTime: string
  location: string
}

const initialFormState: EventFormState = {
  eventName: '',
  description: '',
  maxPlayers: '',
  dateTime: '',
  location: '',
}

const AddEventScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const [form, setForm] = useState<EventFormState>(initialFormState)
  const [touched, setTouched] = useState<Record<keyof EventFormState, boolean>>({
    eventName: false,
    description: false,
    maxPlayers: false,
    dateTime: false,
    location: false,
  })
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [joinAsParticipant, setJoinAsParticipant] = useState(false)
  const user = useSelector((state: IRootState) => state.user)

  const errors = useMemo(() => validateForm(form), [form])
  const isFormValid = Object.keys(errors).length === 0

  const handleChange = (key: keyof EventFormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleBlur = (key: keyof EventFormState) => {
    setTouched(prev => ({ ...prev, [key]: true }))
  }

  const handleSubmit = async () => {
    setHasSubmitted(true)

    if (!isFormValid) {
      return
    }

    const eventDate = new Date(form.dateTime)
    console.log("user Id :",user.loggedInUser_ID);
    console.log("user Name :", user.loggedInName);
    const participants: EventSchema['participants'] = []
    if (joinAsParticipant) {
      participants.push({
        id: String(user.loggedInUser_ID),
        name: user.loggedInName || 'User',
        status: 'confirmed',
      })
    }

    const newEvent: EventSchema = {
      eventTitle: form.eventName.trim(),
      eventDescription: form.description.trim(),
      eventLocation: form.location.trim(),
      maxPlayerLimit: parseInt(form.maxPlayers, 10),
      eventDateTime: Math.floor(eventDate.getTime()),
      createdDate: getCurrentTimeMilliSeconds(),
      hostedBy: {
        id: String(user.loggedInUser_ID),
        name: user.loggedInName || 'User',
      },
      participants,
    }

    try {
      const created = await EventRepository.createEvent(newEvent)

      if (!created) {
        Alert.alert('Error', 'Could not save event. Please try again.')
        return
      }

      Alert.alert('Success', 'Event saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setForm(initialFormState)
            setTouched({
              eventName: false,
              description: false,
              maxPlayers: false,
              dateTime: false,
              location: false,
            })
            setHasSubmitted(false)
            setJoinAsParticipant(false)
            navigation.goBack()
          },
        },
      ])
    } catch (error) {
      console.error('Error saving event', error)
      Alert.alert('Error', 'An unexpected error occurred while saving the event.')
    }
  }

  const showError = (key: keyof EventFormState) =>
    (hasSubmitted || touched[key]) && errors[key]

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
     
        <FormField
          label="Event Name"
          placeholder="Enter event name"
          value={form.eventName}
          onChangeText={text => handleChange('eventName', text)}
          onBlur={() => handleBlur('eventName')}
          errorMessage={showError('eventName') ? errors.eventName : undefined}
        />

        <FormField
          label="Description"
          placeholder="Add a short description"
          value={form.description}
          onChangeText={text => handleChange('description', text)}
          onBlur={() => handleBlur('description')}
          multiline
          errorMessage={showError('description') ? errors.description : undefined}
          inputStyle={styles.multilineInput}
        />

        <FormField
          label="Max Player Limit"
          placeholder="e.g. 10"
          keyboardType="number-pad"
          value={form.maxPlayers}
          onChangeText={text => handleChange('maxPlayers', text)}
          onBlur={() => handleBlur('maxPlayers')}
          errorMessage={showError('maxPlayers') ? errors.maxPlayers : undefined}
        />

        <FormField
          label="Event Date & Time"
          placeholder="e.g., 2025-03-15 14:30"
          value={form.dateTime}
          onChangeText={text => handleChange('dateTime', text)}
          onBlur={() => handleBlur('dateTime')}
          errorMessage={showError('dateTime') ? errors.dateTime : undefined}
        />

        <FormField
          label="Event Location"
          placeholder="Enter event location"
          value={form.location}
          onChangeText={text => handleChange('location', text)}
          onBlur={() => handleBlur('location')}
          errorMessage={showError('location') ? errors.location : undefined}
        />

        <TouchableOpacity
          style={styles.checkboxRow}
          activeOpacity={0.8}
          onPress={() => setJoinAsParticipant(prev => !prev)}
        >
          <View style={[styles.checkbox, joinAsParticipant && styles.checkboxChecked]}>
            {joinAsParticipant && <View style={styles.checkboxIndicator} />}
          </View>
          <Text style={styles.checkboxLabel}>Join this event as a participant</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, !isFormValid && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={!isFormValid}
        >
          <Text style={styles.submitText}>Submit</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

type FormFieldProps = {
  label: string
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  keyboardType?: KeyboardTypeOptions
  multiline?: boolean
  errorMessage?: string
  inputStyle?: StyleProp<TextStyle>
  onBlur?: () => void
}

const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  errorMessage,
  inputStyle,
  onBlur,
}: FormFieldProps) => (
    
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.multilineInput, inputStyle]}
      placeholder={placeholder}
      placeholderTextColor="#8c92a3"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      multiline={multiline}
      onBlur={onBlur}
    />
    {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
  </View>
)

const validateForm = (values: EventFormState) => {
  const newErrors: Partial<Record<keyof EventFormState, string>> = {}

  if (!values.eventName.trim()) {
    newErrors.eventName = 'Event name is required.'
  }

  if (!values.description.trim()) {
    newErrors.description = 'Description is required.'
  } else if (values.description.trim().length < 10) {
    newErrors.description = 'Description should be at least 10 characters.'
  }

  if (!values.maxPlayers.trim()) {
    newErrors.maxPlayers = 'Max player limit is required.'
  } else {
    const parsedLimit = parseInt(values.maxPlayers, 10)
    if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
      newErrors.maxPlayers = 'Enter a valid number greater than 0.'
    }
  }

  if (!values.dateTime.trim()) {
    newErrors.dateTime = 'Event date & time is required.'
  } else if (Number.isNaN(Date.parse(values.dateTime))) {
    newErrors.dateTime = 'Enter a valid date (e.g., 2025-03-15 14:30).'
  }

  if (!values.location.trim()) {
    newErrors.location = 'Location is required.'
  }

  return newErrors
}

export default AddEventScreen;

const styles = ScaledSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dashboardBgColor,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: '24@s',
  },
 
  fieldContainer: {
    marginBottom: '20@s',
  },
  label: {
    color: Colors.white,
    marginBottom:  '8@s',
    fontSize: '14@ms',
    fontWeight: '500',
  },
  input: {
    borderRadius: '12@s',
    backgroundColor: Colors.eventCardBgColor,
    color: Colors.white,
    paddingHorizontal: '16@s',
    paddingVertical: '14@s',
    fontSize: '16@ms',
    borderWidth: '1@s',
    borderColor: Colors.eventCardBorderColor,
  },
  multilineInput: {
    minHeight: '100@s',
    textAlignVertical: 'top',
  },
  errorText: {
    marginTop: '6@s',
    color: '#FF6B6B',
    fontSize: '13@ms',
  },
  submitButton: {
    marginTop: '16@s',
    borderRadius: '14@s',
    backgroundColor: Colors.primary,
    paddingVertical: '18@s',
    alignItems: 'center',
  },
  submitText: {
    color: Colors.dashboardBgColor,
    fontSize: '16@ms',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: '8@s',
  },
  checkbox: {
    width: '22@s',
    height: '22@s',
    borderRadius: '6@s',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.eventCardBgColor,
  },
  checkboxChecked: {
    backgroundColor: Colors.primaryBlue,
    borderColor: Colors.primaryBlue,
  },
  checkboxIndicator: {
    width: '10@s',
    height: '10@s',
    borderRadius: '3@s',
    backgroundColor: Colors.dashboardBgColor,
  },
  checkboxLabel: {
    marginLeft: '12@s',
    color: Colors.white,
    flex: 1,
  },
})


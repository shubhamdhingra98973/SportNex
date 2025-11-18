import React, { useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import type { KeyboardTypeOptions, StyleProp, TextStyle } from 'react-native'
import { Colors } from '@global'
import { ScaledSheet } from 'react-native-size-matters'

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
  const [form, setForm] = useState<EventFormState>(initialFormState)
  const [touched, setTouched] = useState<Record<keyof EventFormState, boolean>>({
    eventName: false,
    description: false,
    maxPlayers: false,
    dateTime: false,
    location: false,
  })
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const errors = useMemo(() => validateForm(form), [form])
  const isFormValid = Object.keys(errors).length === 0

  const handleChange = (key: keyof EventFormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleBlur = (key: keyof EventFormState) => {
    setTouched(prev => ({ ...prev, [key]: true }))
  }

  const handleSubmit = () => {
    setHasSubmitted(true)

    if (!isFormValid) {
      return
    }

    Alert.alert('Success', 'Event saved successfully!')
    console.log('Event saved', {
      ...form,
      maxPlayers: Number(form.maxPlayers),
      dateTime: new Date(form.dateTime).toISOString(),
    })

    setForm(initialFormState)
    setTouched({
      eventName: false,
      description: false,
      maxPlayers: false,
      dateTime: false,
      location: false,
    })
    setHasSubmitted(false)
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
})


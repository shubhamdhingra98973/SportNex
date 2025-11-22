/**
 * DashboardScreen Component
 * 
 * Main screen displaying all events with the following features:
 * - View all events or filter to show only events created by the logged-in user
 * - Request to join events (if not past and not full)
 * - Withdraw from events (if not past)
 * - Host can accept/reject participant requests
 * - Automatic expiration of pending participants when host views past events
 * - Personalized greeting based on time of day
 */

import React, { useCallback, useLayoutEffect, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import { ScaledSheet } from 'react-native-size-matters'
import {Colors , formatDate , normalizeTimestampToSecondsString} from '@global'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '@navigation/types'
import { IRootState } from '@storage/redux/configureStore'
import EventRepository from '@storage/sqlite/repository/EventRepository'
import type { EventSchema } from '@storage/sqlite/schema/EventSchema'
import { logout } from '@storage/redux/actions/userActions'
import { clearAuthState } from '@storage/authStorage'


/**
 * Checks if an event's date/time has already passed
 * @param timestamp - Event timestamp (can be in milliseconds or seconds)
 * @returns true if the event time is in the past, false otherwise
 */
const hasEventPassed = (timestamp: number | string): boolean => {
  const numericValue = Number(timestamp)
  if (!Number.isFinite(numericValue)) {
    return false
  }
  // Determine if timestamp is in milliseconds (> 1e12) or seconds
  const isMilliseconds = numericValue > 1e12
  const eventTimeInMs = isMilliseconds ? numericValue : numericValue * 1000
  return eventTimeInMs <= Date.now()
}

/**
 * EventCard Component
 * Displays a single event card with key information
 * @param event - The event data to display
 * @param onPress - Callback when the card is pressed
 */
const EventCard = ({ event, onPress }: { event: EventSchema; onPress: () => void }) => {
  const confirmed = (event.participants ?? []).filter(p => p.status === 'confirmed').length
  const formattedDate = formatDate(normalizeTimestampToSecondsString(event.eventDateTime))
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.title}>{event.eventTitle}</Text>
      <Text style={styles.description}>{event.eventDescription}</Text>
      <Text style={styles.meta}>Organiser : {event.hostedBy.name}</Text>
      <Text style={styles.meta}>Location : {event.eventLocation}</Text>
      <Text style={styles.meta}>
        {confirmed}/{event.maxPlayerLimit} confirmed · {formattedDate}
      </Text>
    </TouchableOpacity>
  )
}

const DashboardScreen = () => {
  // Navigation and route setup
  const route = useRoute()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const { token: tokenFromParams } = (route.params as { token?: string }) ?? {}
  
  // Redux state - user authentication and profile data
  const { loggedInToken, loggedInUser_ID, loggedInName } = useSelector((state: IRootState) => state.user)
  const dispatch = useDispatch()
  
  // Use token from params if available, otherwise use token from Redux state
  const token = tokenFromParams || loggedInToken || loggedInUser_ID
  
  // Component state management
  const [events, setEvents] = useState<EventSchema[]>([]) // All events fetched from database
  const [loading, setLoading] = useState(true) // Loading state for events fetch
  const [error, setError] = useState<string | null>(null) // Error message if events fail to load
  const [selectedEvent, setSelectedEvent] = useState<EventSchema | null>(null) // Currently selected event for modal view
  const [requestTracker, setRequestTracker] = useState<Record<string, boolean>>({}) // Tracks pending join requests locally
  const [showMyEventsOnly, setShowMyEventsOnly] = useState(false) // Filter toggle for showing only user's events

  /**
   * Navigation handler - navigates to AddEventScreen to create a new event
   */
  const navigateToAddEvent = useCallback(() => {
    navigation.navigate('AddEventScreen')
  }, [navigation])

  /**
   * Logout handler - clears authentication state and redirects to login screen
   */
  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await clearAuthState()
          dispatch(logout())
          navigation.reset({
            index: 0,
            routes: [{ name: 'LoginRegisterScreen' }],
          })
        },
      },
    ])
  }, [dispatch, navigation])

  /**
   * Configure navigation header with Add Event button (left) and Logout button (right)
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity style={styles.headerButton} onPress={navigateToAddEvent}>
          <Text style={styles.headerButtonText}>+</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      ),
    })
  }, [navigation, handleLogout, navigateToAddEvent])

  // Derived values from selectedEvent - computed for use in UI and logic
  const selectedParticipants = selectedEvent?.participants ?? [] // All participants of the selected event
  const selectedEventKey = selectedEvent ? `${selectedEvent.eventTitle}-${selectedEvent.createdDate}` : '' // Unique key for tracking requests
  const currentUserId = loggedInUser_ID ? String(loggedInUser_ID) : '' // Current user ID as string
  const currentParticipant = selectedParticipants.find(participant => String(participant.id) === currentUserId) // Current user's participant record
  const isSelectedEventPast = selectedEvent ? hasEventPassed(selectedEvent.eventDateTime) : false // Whether selected event has already occurred
  const hasApplied = // Whether current user has already requested to join or is a participant
    !!selectedEvent &&
    (Boolean(currentParticipant) || (selectedEventKey && requestTracker[selectedEventKey]))
  const confirmedCount = selectedParticipants.filter(p => p.status === 'confirmed').length // Number of confirmed participants
  const isHost = selectedEvent ? String(selectedEvent.hostedBy?.id ?? '') === String(loggedInUser_ID ?? '') : false // Whether current user is the event host
  const isEventFull = selectedEvent ? confirmedCount >= (selectedEvent.maxPlayerLimit ?? 0) : false // Whether event has reached max capacity
  const shouldShowRequestButton = !!selectedEvent && !hasApplied && !isSelectedEventPast // Show "Request To Join" if user hasn't applied and event hasn't passed
  const showWithdrawButton = // Show "Withdraw" if user is a participant with pending or confirmed status
    !!selectedEvent &&
    !!currentParticipant &&
    (currentParticipant.status === 'pending' || currentParticipant.status === 'confirmed')
  const canWithdraw = showWithdrawButton && !isSelectedEventPast // Can withdraw only if event hasn't passed
  // Participants visible in modal: hosts see all, others see only confirmed or themselves
  const visibleParticipants = isHost
    ? selectedParticipants
    : selectedParticipants.filter(
        participant =>
          participant.status === 'confirmed' || String(participant.id) === String(loggedInUser_ID ?? ''),
      )

  /**
   * Fetches all events from the database
   * Called on screen focus and when manually refreshed
   */
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedEvents = await EventRepository.getAllEvents()
      setEvents(fetchedEvents)
    } catch (err) {
      console.error('Failed to load events', err)
      setError('Unable to load events.')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Refetch events whenever the screen comes into focus
   * Ensures data is up-to-date when returning from other screens
   */
  useFocusEffect(
    useCallback(() => {
      fetchEvents()
    }, [fetchEvents]),
  )

  /**
   * Closes the event details modal
   */
  const closeModal = () => setSelectedEvent(null)

  /**
   * Generates time-based greeting (Good Morning/Good Evening)
   * Based on current hour of the day
   */
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours()
    return hour < 12 ? 'Good Morning' : 'Good Evening'
  }, [])

  // User name for greeting, defaults to 'there' if name is not available
  const userName = loggedInName?.trim().length ? loggedInName : 'there'

  /**
   * Handles event selection when user taps on an event card
   * Special logic: If host views their own past event, automatically expires pending participants
   * @param event - The event that was selected
   */
  const handleEventSelect = useCallback(async (event: EventSchema) => {
    const isEventHost = String(event.hostedBy?.id ?? '') === String(loggedInUser_ID ?? '')
    const eventHasPassed = hasEventPassed(event.eventDateTime)

    // If host is viewing their own past event, update pending participants to expired
    // This ensures pending requests are automatically marked as expired after the event occurs
    if (isEventHost && eventHasPassed && event.id) {
      const participants = event.participants ?? []
      const hasPendingParticipants = participants.some(p => p.status === 'pending')

      if (hasPendingParticipants) {
        try {
          const latestEvent = await EventRepository.getEventById(event.id)
          const latestParticipants = latestEvent?.participants ?? participants
          const updatedParticipants = latestParticipants.map(participant =>
            participant.status === 'pending' ? { ...participant, status: 'expired' as const } : participant,
          )

          const hasChanges = updatedParticipants.some(
            (p, idx) => p.status !== latestParticipants[idx]?.status,
          )

          if (hasChanges) {
            const success = await EventRepository.updateEvent(event.id, { participants: updatedParticipants })
            if (success) {
              // Update the event with the new participants before setting it as selected
              setSelectedEvent({ ...event, participants: updatedParticipants })
              await fetchEvents()
              return
            }
          }
        } catch (err) {
          console.error('Failed to update pending participants to expired', err)
        }
      }
    }

    // If no update needed, just set the selected event
    setSelectedEvent(event)
  }, [loggedInUser_ID, fetchEvents])

  /**
   * Filters events based on the "Show only my events" checkbox
   * When checked, shows only events where the logged-in user is the host
   */
  const filteredEvents = React.useMemo(() => {
    if (!showMyEventsOnly || !loggedInUser_ID) {
      return events
    }
    return events.filter(event => String(event.hostedBy?.id ?? '') === String(loggedInUser_ID))
  }, [events, showMyEventsOnly, loggedInUser_ID])

  /**
   * Handles user's request to join an event
   * Validates conditions (not logged in, event full, event passed) before processing
   * If user is the host, automatically confirms their participation
   * Otherwise, adds them as a pending participant
   */
  const handleRequestToJoin = async () => {
    if (!selectedEvent || !selectedEventKey) return
    if (!loggedInUser_ID) {
      Alert.alert('Not logged in', 'Please log in to request to join this event.')
      return
    }
    if (!selectedEvent.id) {
      Alert.alert('Unavailable', 'Unable to process this event right now.')
      return
    }
    if (hasEventPassed(selectedEvent.eventDateTime)) {
      Alert.alert('Unavailable', 'This event has already been completed.')
      return
    }
    if (isEventFull) {
      Alert.alert('Event full', 'This event already has the maximum number of confirmed players.')
      return
    }

    try {
      const latestEvent = await EventRepository.getEventById(selectedEvent.id)
      const participants = latestEvent?.participants ?? selectedParticipants
      const alreadyRequested = participants.some(p => String(p.id) === String(loggedInUser_ID))

      if (alreadyRequested) {
        Alert.alert('Request pending', 'Your request to join this event is already registered.')
        return
      }

      const updatedParticipants = [
        ...participants,
        {
          id: String(loggedInUser_ID),
          name: loggedInName ?? '',
          status: isHost ? 'confirmed' as const : 'pending' as const,
        },
      ]

      const success = await EventRepository.updateEvent(selectedEvent.id, { participants: updatedParticipants })

      if (!success) {
        Alert.alert('Error', 'Unable to send join request. Please try again.')
        return
      }

      setRequestTracker(prev => ({ ...prev, [selectedEventKey]: true }))
      setSelectedEvent(prev => (prev?.id === selectedEvent.id ? { ...prev, participants: updatedParticipants } : prev))
      await fetchEvents()
      if (isHost) {
        Alert.alert('Request sent', `As you are the host Your participation has been confirmed.`);
      } else {
        Alert.alert('Request sent', `Your request to join ${selectedEvent.eventTitle} has been sent to the host.`)
      }
    } catch (err) {
      console.error('Failed to process join request', err)
      Alert.alert('Error', 'Unable to send join request. Please try again.')
    }
  }

  /**
   * Handles user withdrawal from an event
   * Removes the user from the participant list
   * Only allowed if the event hasn't passed yet
   */
  const handleWithdrawFromEvent = async () => {
    if (!selectedEvent?.id || !currentUserId) {
      Alert.alert('Unavailable', 'Unable to withdraw from this event right now.')
      return
    }

    // Prevent withdrawal from past events
    if (hasEventPassed(selectedEvent.eventDateTime)) {
      Alert.alert('Closed', 'This event has already occurred. Withdrawals are no longer allowed.')
      return
    }

    const participants = selectedEvent.participants ?? []
    const updatedParticipants = participants.filter(participant => String(participant.id) !== currentUserId)

    if (updatedParticipants.length === participants.length) {
      Alert.alert('Not joined', 'You are not part of this event.')
      return
    }

    try {
      const success = await EventRepository.updateEvent(selectedEvent.id, { participants: updatedParticipants })

      if (!success) {
        Alert.alert('Error', 'Unable to withdraw from the event. Please try again.')
        return
      }

      setSelectedEvent(prev => (prev?.id === selectedEvent.id ? { ...prev, participants: updatedParticipants } : prev))
      setRequestTracker(prev => {
        if (!selectedEventKey) {
          return prev
        }
        const next = { ...prev }
        delete next[selectedEventKey]
        return next
      })
      await fetchEvents()
      Alert.alert('Withdrawn', 'You have withdrawn from this event.')
    } catch (err) {
      console.error('Failed to withdraw from event', err)
      Alert.alert('Error', 'Unable to withdraw from the event. Please try again.')
    }
  }

  /**
   * Updates a participant's status (host only)
   * Used to accept/reject participant requests
   * @param participantId - ID of the participant to update
   * @param status - New status: 'confirmed', 'rejected', or 'expired'
   */
  const handleUpdateParticipantStatus = async (
    participantId: string,
    status: 'confirmed' | 'rejected' | 'expired',
  ) => {
    if (!selectedEvent?.id) return
    try {
      // Fetch latest event data to ensure we have the most up-to-date participant list
      const latestEvent = await EventRepository.getEventById(selectedEvent.id)
      const participants = latestEvent?.participants ?? selectedParticipants
      const updatedParticipants = participants.map(participant =>
        String(participant.id) === String(participantId) ? { ...participant, status } : participant,
      )

      const success = await EventRepository.updateEvent(selectedEvent.id, { participants: updatedParticipants })
      if (!success) {
        Alert.alert('Error', 'Unable to update participant status. Please try again.')
        return
      }

      // Update local state and refresh events list
      setSelectedEvent(prev => (prev?.id === selectedEvent.id ? { ...prev, participants: updatedParticipants } : prev))
      await fetchEvents()
      Alert.alert('Success', `Participant status updated to ${status}.`)
    } catch (err) {
      console.error('Failed to update participant status', err)
      Alert.alert('Error', 'Unable to update participant status. Please try again.')
    }
  }

  return (
    <View style={styles.container}>
      {/* Main events list */}
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filteredEvents}
        refreshing={loading}
        onRefresh={fetchEvents}
        keyExtractor={(item, index) => item.id ?? `${item.eventTitle}-${item.createdDate ?? index}`}
        ListHeaderComponent={
          <View>
            {/* Personalized greeting section */}
            <View style={styles.greetingContainer}>
              <Text style={styles.greetingName}>Hi {userName},</Text>
              <Text style={styles.greetingMessage}>{greeting}</Text>
            </View>
            {/* Filter checkbox - show only events created by logged-in user */}
            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.8}
              onPress={() => setShowMyEventsOnly(prev => !prev)}
            >
              <View style={[styles.checkbox, showMyEventsOnly && styles.checkboxChecked]}>
                {showMyEventsOnly && <View style={styles.checkboxIndicator} />}
              </View>
              <Text style={styles.checkboxLabel}>Show only my events</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primaryBlue} />
            ) : (
              <Text style={styles.emptyStateText}>{error ?? 'No events found yet.'}</Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <EventCard
            event={item}
            onPress={() => {
              handleEventSelect(item)
            }}
          />
        )}
      />

      {/* Event details modal - shown when an event is selected */}
      <Modal animationType="slide" transparent visible={!!selectedEvent} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedEvent?.eventTitle}</Text>
            {/* Participants list */}
            <ScrollView style={styles.participantList} contentContainerStyle={styles.participantListContent}>
              {visibleParticipants.length === 0 ? (
                <Text style={styles.emptyStateText}>No players have joined yet.</Text>
              ) : (
                visibleParticipants.map(player => {
                  const isPending = player.status === 'pending'
                  // Host can accept/reject pending requests
                  const showActions = isHost && isPending
                  return (
                  <View key={player.id} style={styles.participantRow}>
                    <View>
                      <Text style={styles.participantName}>{player.name}</Text>
                      <Text style={styles.participantStatus}>Status: {player.status}</Text>
                    </View>
                    {showActions ? (
                      // Host action buttons for pending participants
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonAccept]}
                          onPress={() => handleUpdateParticipantStatus(String(player.id), 'confirmed')}>
                          <Text style={styles.actionButtonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonReject]}
                          onPress={() => handleUpdateParticipantStatus(String(player.id), 'rejected')}>
                          <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      // Status badge for non-pending or non-host view
                      <View style={[styles.statusPill, styles[`statusPill_${player.status}` as keyof typeof styles]]}>
                        <Text style={styles.statusPillText}>{player.status}</Text>
                      </View>
                    )}
                  </View>
                )
                })
              )}
            </ScrollView>

            {/* Request to join button - shown if user hasn't applied and event hasn't passed */}
            {shouldShowRequestButton && (
              <TouchableOpacity style={styles.requestButton} onPress={handleRequestToJoin}>
                <Text style={styles.requestButtonText}>Request To Join</Text>
              </TouchableOpacity>
            )}
            {/* Withdraw button - shown if user is a participant (pending or confirmed) */}
            {showWithdrawButton && (
              <TouchableOpacity
                style={[
                  styles.requestButton,
                  styles.withdrawButton,
                  !canWithdraw && styles.withdrawButtonDisabled,
                ]}
                onPress={handleWithdrawFromEvent}
                disabled={!canWithdraw}>
                <Text style={styles.requestButtonText}>
                  {canWithdraw ? 'Withdraw From Event' : 'Event already completed'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export default DashboardScreen;

/**
 * Component styles using ScaledSheet for responsive sizing
 * Uses scaled units (@s for scale, @vs for vertical scale, @ms for moderate scale)
 */
const styles = ScaledSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dashboardBgColor
  },
  listContent: {
    padding: '16@s',
    gap: '12@s',
  },
  greetingContainer: {
    marginBottom: '20@vs',
    alignSelf: 'flex-start',
  },
  greetingName: {
    color: Colors.white,
    fontSize: '24@ms',
    fontWeight: '600',
    textAlign: 'left',
  },
  greetingMessage: {
    marginTop: '6@vs',
    color: Colors.primaryBlue,
    fontSize: '18@ms',
    fontWeight: '500',
    textAlign: 'left',
  },
  header: {
    marginBottom: '12@s',
  },
  headerText: {
    fontSize: '24@ms',
    fontWeight: '600',
    color: Colors.white,
  },
  subHeader: {
    marginTop: '4@vs',
    color: '#8a93a6',
  },
  card: {
    padding: '16@s',
    borderRadius: '12@s',
    backgroundColor: Colors.eventCardBgColor,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.eventCardBorderColor,
    gap: '4@vs',
  },
  title: {
    fontSize: '18@ms',
    fontWeight: '600',
    color: Colors.white,
  },
  description: {
    marginTop: '6@vs',
    color: Colors.eventCardDescriptionColor,
  },
  meta: {
    marginTop: '4@vs',
    color: '#8a93a6',
    fontSize: '13@ms',
  },
  headerButton: {
    marginRight: '12@s',
    width: '32@s',
    height: '32@s',
    borderRadius: '16@s',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    color: Colors.primaryBlue,
    fontSize: '20@ms',
    fontWeight: '700',
    lineHeight: '24@ms',
  },
  logoutButton: {
    marginRight: '12@s',
    paddingHorizontal: '12@s',
    paddingVertical: '6@vs',
    borderRadius: '16@s',
    backgroundColor: Colors.primaryBlue,
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: '13@ms',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: '16@s',
  },
  modalContent: {
    borderRadius: '16@s',
    backgroundColor: Colors.eventCardBgColor,
    padding: '20@s',
    gap: '12@vs',
  },
  modalTitle: {
    fontSize: '20@ms',
    fontWeight: '600',
    color: Colors.white,
  },
  modalSubtitle: {
    fontSize: '14@ms',
    color: '#8a93a6',
  },
  participantList: {
    maxHeight: '260@vs',
  },
  participantListContent: {
    gap: '12@vs',
  },
  emptyStateText: {
    color: '#8a93a6',
    textAlign: 'center',
  },
  emptyListContainer: {
    flex: 1,
    minHeight: '200@vs',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12@s',
    borderRadius: '10@s',
    backgroundColor: Colors.dashboardBgColor,
  },
  participantName: {
    color: Colors.white,
    fontSize: '15@ms',
    fontWeight: '500',
  },
  participantStatus: {
    color: '#8a93a6',
    marginTop: '4@vs',
    fontSize: '12@ms',
  },
  statusPill: {
    paddingHorizontal: '12@s',
    paddingVertical: '6@vs',
    borderRadius: '999@s',
    backgroundColor: '#2b2f40',
  },
  statusPillText: {
    color: Colors.white,
    fontSize: '12@ms',
    textTransform: 'capitalize',
  },
  statusPill_confirmed: {
    backgroundColor: '#1f9254',
  },
  statusPill_pending: {
    backgroundColor: '#f4a261',
  },
  statusPill_rejected: {
    backgroundColor: '#e76f51',
  },
  statusPill_expired: {
    backgroundColor: '#6c757d',
  },
  requestButton: {
    marginTop: '8@vs',
    backgroundColor: Colors.primaryBlue,
    borderRadius: '10@s',
    paddingVertical: '12@vs',
    alignItems: 'center',
  },
  withdrawButton: {
    backgroundColor: '#e76f51',
  },
  withdrawButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  requestButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: '15@ms',
  },
  closeButton: {
    paddingVertical: '10@vs',
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.primaryBlue,
    fontSize: '14@ms',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: '8@s',
  },
  actionButton: {
    paddingVertical: '6@vs',
    paddingHorizontal: '12@s',
    borderRadius: '8@s',
  },
  actionButtonAccept: {
    backgroundColor: '#1f9254',
  },
  actionButtonReject: {
    backgroundColor: '#e76f51',
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: '12@ms',
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: '8@vs',
    marginBottom: '12@vs',
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
    fontSize: '14@ms',
  },
})
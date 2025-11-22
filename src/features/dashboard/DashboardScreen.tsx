import React, { useCallback, useLayoutEffect, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import { ScaledSheet } from 'react-native-size-matters'
import {Colors , formatDate } from '@global'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '@navigation/types'
import { IRootState } from '@storage/redux/configureStore'
import EventRepository from '@storage/sqlite/repository/EventRepository'
import type { EventSchema } from '@storage/sqlite/schema/EventSchema'
import { logout } from '@storage/redux/actions/userActions'
import { clearAuthState } from '@storage/authStorage'

const normalizeTimestampToSecondsString = (timestamp: number | string): string => {
  const numericValue = Number(timestamp)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '0'
  }

  const needsConversion = numericValue > 1e11
  const seconds = needsConversion ? Math.floor(numericValue / 1000) : Math.floor(numericValue)
  return seconds.toString()
}

const hasEventPassed = (timestamp: number | string): boolean => {
  const numericValue = Number(timestamp)
  if (!Number.isFinite(numericValue)) {
    return false
  }
  const isMilliseconds = numericValue > 1e12
  const eventTimeInMs = isMilliseconds ? numericValue : numericValue * 1000
  return eventTimeInMs <= Date.now()
}

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
  const route = useRoute()
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>()
  const { token: tokenFromParams } = (route.params as { token?: string }) ?? {}
  const { loggedInToken, loggedInUser_ID, loggedInName } = useSelector((state: IRootState) => state.user)
  const dispatch = useDispatch()
  // Use token from params if available, otherwise use token from Redux state
  const token = tokenFromParams || loggedInToken || loggedInUser_ID
  const [events, setEvents] = useState<EventSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventSchema | null>(null)
  const [requestTracker, setRequestTracker] = useState<Record<string, boolean>>({})

  const navigateToAddEvent = useCallback(() => {
    navigation.navigate('AddEventScreen')
  }, [navigation])

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

  const selectedParticipants = selectedEvent?.participants ?? []
  const selectedEventKey = selectedEvent ? `${selectedEvent.eventTitle}-${selectedEvent.createdDate}` : ''
  const currentUserId = loggedInUser_ID ? String(loggedInUser_ID) : ''
  const currentParticipant = selectedParticipants.find(participant => String(participant.id) === currentUserId)
  const isSelectedEventPast = selectedEvent ? hasEventPassed(selectedEvent.eventDateTime) : false
  const hasApplied =
    !!selectedEvent &&
    (Boolean(currentParticipant) || (selectedEventKey && requestTracker[selectedEventKey]))
  const confirmedCount = selectedParticipants.filter(p => p.status === 'confirmed').length
  const isHost = selectedEvent ? String(selectedEvent.hostedBy?.id ?? '') === String(loggedInUser_ID ?? '') : false
  const isEventFull = selectedEvent ? confirmedCount >= (selectedEvent.maxPlayerLimit ?? 0) : false
  const shouldShowRequestButton = !!selectedEvent && !hasApplied && !isSelectedEventPast
  const showWithdrawButton =
    !!selectedEvent &&
    !!currentParticipant &&
    (currentParticipant.status === 'pending' || currentParticipant.status === 'confirmed')
  const canWithdraw = showWithdrawButton && !isSelectedEventPast
  const visibleParticipants = isHost
    ? selectedParticipants
    : selectedParticipants.filter(
        participant =>
          participant.status === 'confirmed' || String(participant.id) === String(loggedInUser_ID ?? ''),
      )

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

  useFocusEffect(
    useCallback(() => {
      fetchEvents()
    }, [fetchEvents]),
  )

  const closeModal = () => setSelectedEvent(null)

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours()
    return hour < 12 ? 'Good Morning' : 'Good Evening'
  }, [])

  const userName = loggedInName?.trim().length ? loggedInName : 'there'

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

  const handleWithdrawFromEvent = async () => {
    if (!selectedEvent?.id || !currentUserId) {
      Alert.alert('Unavailable', 'Unable to withdraw from this event right now.')
      return
    }

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

  const handleUpdateParticipantStatus = async (
    participantId: string,
    status: 'confirmed' | 'rejected' | 'expired',
  ) => {
    if (!selectedEvent?.id) return
    try {
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
      <FlatList
        contentContainerStyle={styles.listContent}
        data={events}
        refreshing={loading}
        onRefresh={fetchEvents}
        keyExtractor={(item, index) => item.id ?? `${item.eventTitle}-${item.createdDate ?? index}`}
        ListHeaderComponent={
          <View style={styles.greetingContainer}>
            <Text style={styles.greetingName}>Hi {userName},</Text>
            <Text style={styles.greetingMessage}>{greeting}</Text>
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
              setSelectedEvent(item)
            }}
          />
        )}
      />

      <Modal animationType="slide" transparent visible={!!selectedEvent} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedEvent?.eventTitle}</Text>
            <ScrollView style={styles.participantList} contentContainerStyle={styles.participantListContent}>
              {visibleParticipants.length === 0 ? (
                <Text style={styles.emptyStateText}>No players have joined yet.</Text>
              ) : (
                visibleParticipants.map(player => {
                  const isPending = player.status === 'pending'
                  const showActions = isHost && isPending
                  return (
                  <View key={player.id} style={styles.participantRow}>
                    <View>
                      <Text style={styles.participantName}>{player.name}</Text>
                      <Text style={styles.participantStatus}>Status: {player.status}</Text>
                    </View>
                    {showActions ? (
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
                      <View style={[styles.statusPill, styles[`statusPill_${player.status}` as keyof typeof styles]]}>
                        <Text style={styles.statusPillText}>{player.status}</Text>
                      </View>
                    )}
                  </View>
                )
                })
              )}
            </ScrollView>

            {shouldShowRequestButton && (
              <TouchableOpacity style={styles.requestButton} onPress={handleRequestToJoin}>
                <Text style={styles.requestButtonText}>Request To Join</Text>
              </TouchableOpacity>
            )}
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
})
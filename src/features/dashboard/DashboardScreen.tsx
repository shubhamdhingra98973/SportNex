import React, { useCallback, useLayoutEffect, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { ScaledSheet } from 'react-native-size-matters'
import {Colors , formatDate } from '@global'
import { StackNavigationProp } from '@react-navigation/stack'
import { RootStackParamList } from '@navigation/types'
import { IRootState } from '@storage/redux/configureStore'
import EventRepository from '@storage/sqlite/repository/EventRepository'
import type { EventSchema } from '@storage/sqlite/schema/EventSchema'

const normalizeTimestampToSecondsString = (timestamp: number | string): string => {
  const numericValue = Number(timestamp)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '0'
  }

  const needsConversion = numericValue > 1e11
  const seconds = needsConversion ? Math.floor(numericValue / 1000) : Math.floor(numericValue)
  return seconds.toString()
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
  const { loggedInToken, loggedInUser_ID } = useSelector((state: IRootState) => state.user)
  // Use token from params if available, otherwise use token from Redux state
  const token = tokenFromParams || loggedInToken || loggedInUser_ID
  const [events, setEvents] = useState<EventSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventSchema | null>(null)
  const [requestTracker, setRequestTracker] = useState<Record<string, boolean>>({})

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('AddEventScreen')}>
          <Text style={styles.headerButtonText}>+</Text>
        </TouchableOpacity>
      ),
    })
  }, [navigation])

  const selectedParticipants = selectedEvent?.participants ?? []
  const selectedEventKey = selectedEvent ? `${selectedEvent.eventTitle}-${selectedEvent.createdDate}` : ''
  const hasApplied =
  !!selectedEvent &&
  (selectedParticipants.some(p => String(p.id) === String(token)) || (selectedEventKey && requestTracker[selectedEventKey]))

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

  const handleRequestToJoin = () => {
    if (!selectedEvent || !selectedEventKey) return
    setRequestTracker(prev => ({ ...prev, [selectedEventKey]: true }))
    Alert.alert('Request sent', `Your request to join ${selectedEvent.eventTitle} has been sent to the host.`)
  }

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={events}
        refreshing={loading}
        onRefresh={fetchEvents}
        keyExtractor={(item, index) => item.id ?? `${item.eventTitle}-${item.createdDate ?? index}`}
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
              {selectedParticipants.length === 0 ? (
                <Text style={styles.emptyStateText}>No players have joined yet.</Text>
              ) : (
                selectedParticipants.map(player => (
                  <View key={player.id} style={styles.participantRow}>
                    <View>
                      <Text style={styles.participantName}>{player.name}</Text>
                      <Text style={styles.participantStatus}>Status: {player.status}</Text>
                    </View>
                    <View style={[styles.statusPill, styles[`statusPill_${player.status}` as keyof typeof styles]]}>
                      <Text style={styles.statusPillText}>{player.status}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {!hasApplied && (
              <TouchableOpacity style={styles.requestButton} onPress={handleRequestToJoin}>
                <Text style={styles.requestButtonText}>Request To Join</Text>
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
    // backgroundColor: Colors.primary,
  },
  headerButtonText: {
    color: Colors.primaryBlue,
    fontSize: '20@ms',
    fontWeight: '700',
    lineHeight: '24@ms',
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
})
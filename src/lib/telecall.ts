/**
 * Peer-to-peer video call for telemedicine (WebRTC: encrypted audio, video and chat between the two browsers).
 *
 * Signalling — introducing the two sides — goes over a BroadcastChannel, which connects tabs on the same device.
 * That makes the demo work end to end (open the patient link in another tab). Between different devices a small
 * signalling server (WebSocket) and a TURN relay replace the channel; nothing else changes.
 */
export type Role = 'clinician' | 'patient'
export type Signal =
  | { type: 'hello'; from: Role; name: string; consent?: boolean }
  | { type: 'offer' | 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; candidate: RTCIceCandidateInit }
  | { type: 'bye'; from: Role }

export interface ChatLine { from: Role; name: string; text: string; at: string }

const channelName = (code: string) => `northstar-telemedicine-${code.toUpperCase()}`

/** A six-character visit code, without look-alike characters. */
export function makeJoinCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(6)), (byte) => alphabet[byte % alphabet.length]).join('')
}

/** Who is waiting: listens on each visit's channel for a patient announcing themselves. */
export function watchWaitingRoom(codes: string[], onHello: (code: string, name: string) => void, onBye: (code: string) => void) {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  const channels = codes.map((code) => {
    const channel = new BroadcastChannel(channelName(code))
    channel.onmessage = (event: MessageEvent<Signal>) => {
      if (event.data.type === 'hello' && event.data.from === 'patient') onHello(code, event.data.name)
      if (event.data.type === 'bye' && event.data.from === 'patient') onBye(code)
    }
    return channel
  })
  return () => channels.forEach((channel) => channel.close())
}

export class TeleCall {
  private channel: BroadcastChannel
  private pc: RTCPeerConnection | null = null
  private chat: RTCDataChannel | null = null
  private helloTimer = 0
  private pendingIce: RTCIceCandidateInit[] = []
  private offeredAt = 0
  onRemoteStream: (stream: MediaStream | null) => void = () => {}
  onState: (state: 'waiting' | 'connecting' | 'connected' | 'ended') => void = () => {}
  onChat: (line: ChatLine) => void = () => {}
  onPeerName: (name: string, consent: boolean) => void = () => {}
  /** The patient's consent to a video consultation, sent with every hello. */
  consent = false

  constructor(public code: string, public role: Role, public name: string, private local: MediaStream | null) {
    this.channel = new BroadcastChannel(channelName(code))
    this.channel.onmessage = (event: MessageEvent<Signal>) => { void this.handle(event.data) }
  }

  /** The patient announces themselves until the clinician answers; the clinician says hello once. */
  start() {
    this.onState('waiting')
    const hello = () => this.post({ type: 'hello', from: this.role, name: this.name, consent: this.consent })
    hello()
    if (this.role === 'patient') this.helloTimer = window.setInterval(hello, 2000)
  }

  private ended = false
  private post(signal: Signal) { if (this.ended) return; try { this.channel.postMessage(signal) } catch { /* channel already closed */ } }

  private makePeer() {
    this.pc?.close()
    const pc = new RTCPeerConnection({ iceServers: [] })
    this.local?.getTracks().forEach((track) => pc.addTrack(track, this.local!))
    pc.onicecandidate = (event) => { if (event.candidate) this.post({ type: 'ice', candidate: event.candidate.toJSON() }) }
    pc.ontrack = (event) => this.onRemoteStream(event.streams[0] ?? new MediaStream([event.track]))
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') { window.clearInterval(this.helloTimer); this.onState('connected') }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') this.onState('ended')
    }
    pc.ondatachannel = (event) => this.bindChat(event.channel)
    this.pc = pc
    return pc
  }

  private bindChat(channel: RTCDataChannel) {
    this.chat = channel
    channel.onmessage = (event) => { try { this.onChat(JSON.parse(event.data) as ChatLine) } catch { /* ignore */ } }
  }

  private async handle(signal: Signal) {
    if (signal.type === 'hello' && signal.from !== this.role) {
      this.onPeerName(signal.name, Boolean(signal.consent))
      // The clinician starts the call when the patient is there.
      // A fresh attempt only if none is under way (the patient repeats hello every 2 s).
      const busy = this.pc && (this.pc.connectionState === 'connected' || Date.now() - this.offeredAt < 6000)
      if (this.role === 'clinician' && !busy) {
        this.offeredAt = Date.now()
        this.onState('connecting')
        const pc = this.makePeer()
        this.bindChat(pc.createDataChannel('chat'))
        await pc.setLocalDescription(await pc.createOffer())
        this.post({ type: 'offer', sdp: pc.localDescription!.toJSON() })
      }
      return
    }
    if (signal.type === 'offer' && this.role === 'patient') {
      this.onState('connecting')
      const pc = this.makePeer()
      await pc.setRemoteDescription(signal.sdp)
      await pc.setLocalDescription(await pc.createAnswer())
      this.post({ type: 'answer', sdp: pc.localDescription!.toJSON() })
      this.flushIce()
      return
    }
    if (signal.type === 'answer' && this.role === 'clinician' && this.pc && !this.pc.currentRemoteDescription) {
      await this.pc.setRemoteDescription(signal.sdp)
      this.flushIce()
      return
    }
    if (signal.type === 'ice') {
      if (this.pc?.remoteDescription) await this.pc.addIceCandidate(signal.candidate).catch(() => {})
      else this.pendingIce.push(signal.candidate)
      return
    }
    if (signal.type === 'bye' && signal.from !== this.role) {
      this.pc?.close(); this.pc = null
      this.onRemoteStream(null)
      this.onState(this.role === 'clinician' ? 'waiting' : 'ended')
    }
  }

  private flushIce() {
    const list = this.pendingIce.splice(0)
    list.forEach((candidate) => { void this.pc?.addIceCandidate(candidate).catch(() => {}) })
  }

  /** Swap the outgoing video (camera ↔ screen share). */
  replaceVideo(track: MediaStreamTrack | null) {
    const sender = this.pc?.getSenders().find((item) => item.track?.kind === 'video')
    if (sender) void sender.replaceTrack(track)
  }

  send(text: string) {
    const line: ChatLine = { from: this.role, name: this.name, text, at: new Date().toISOString() }
    if (this.chat?.readyState === 'open') this.chat.send(JSON.stringify(line))
    return line
  }

  get connected() { return this.pc?.connectionState === 'connected' }

  /** Safe to call more than once (e.g. the End button, then the page closing). */
  end() {
    if (this.ended) return
    window.clearInterval(this.helloTimer)
    this.post({ type: 'bye', from: this.role })
    this.ended = true
    this.pc?.close(); this.pc = null
    this.channel.close()
    this.onState('ended')
  }
}

/** Camera and microphone, or null when the browser or page does not allow them. */
export async function openMedia(): Promise<{ stream: MediaStream | null; problem?: string }> {
  if (!navigator.mediaDevices?.getUserMedia) return { stream: null, problem: 'This browser cannot use a camera here.' }
  try {
    return { stream: await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true }) }
  } catch {
    try { return { stream: await navigator.mediaDevices.getUserMedia({ audio: true }), problem: 'Camera not available — audio only.' } } catch { return { stream: null, problem: 'Camera and microphone are not available or permission was refused. You can still chat.' } }
  }
}

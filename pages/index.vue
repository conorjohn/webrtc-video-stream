<template>
    <div>
        <p>local id: {{from}}</p>
        <input v-model="to" placeholder="remote id"/>
        <button v-on:click="onCall">call</button>
    </div>
</template>

<script lang="js">
  export default {
    // Convert to Angular, maybe Ionic?
    data: () => ({
      from: null,
      to: null,
      conn: null,
      pc: null,
      chan: null,
      handlers: {},
    }),
    methods: {
      toServer(v) {
        this.conn.send(JSON.stringify({to: this.to, from: this.from, ...v}));
      },
      onServer(req, handler) {
        this.handlers[req] = handler;
      },
      async onCall() {
         const stream = await navigator.mediaDevices.getUserMedia({video: true})
         this.pc.addStream(stream);
        this.chan  = this.pc.createDataChannel('foo');
        this.chan.onmessage = v => {
          console.log(`data received: ${v.data}`);
        };
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        console.log("sending offer...");
        this.toServer({req: 'offer', offer});
      },
    },
    async mounted() {
      //look into RTCPeerConnection() api
      this.pc = new RTCPeerConnection();
      this.pc.onicecandidate = e => {
        if (e.candidate) {
          this.toServer({req: 'ice', candidate: e.candidate});
        }
      };
      this.pc.ondatachannel = e => {
        const onChannelReady = () => {
          console.log("channel attached");
          this.chan = e.channel;
          this.chan.send("foo");
        };
        if (e.channel.readyState !== 'open') {
          e.channel.onopen = onChannelReady;
        }
        else {
          onChannelReady();
        }
      };
      this.pc.onaddstream = e => {
        const video = document.createElement('video');
        document.body.appendChild(video);
        video.src = window.URL.createObjectURL(e.stream);
        video.play();
      };
      // generating a web socket, figure out how to handle
      // constant stream of data for charts
      this.conn = new WebSocket('ws://localhost:8080');
      this.conn.onopen = () => {
        this.conn.onmessage = (message) => {
          const data = JSON.parse(message.data);
          if (this.handlers[data.req]) this.handlers[data.req](data);
        };
        this.onServer('register', v => this.from = v.id);
        this.onServer('offer', async (v) => {
          await this.pc.setRemoteDescription(v.offer);
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          this.toServer({req: 'answer', to: v.from, answer});
        });
        this.onServer('answer', async (v) => {
          await this.pc.setRemoteDescription(v.answer);
        });
        this.onServer('ice', (v) => {
          this.pc.addIceCandidate(v.candidate);
        });
        this.toServer({req: 'register'});
      };
    },
  }
</script>
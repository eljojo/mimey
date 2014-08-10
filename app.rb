require 'faye/websocket'
require 'rack'
require 'yajl'
require 'mimey'

emulator = Mimey::Emulator.new
emulator.load_rom("./test_roms/opus5.gb")
emulator.reset

Thread.new do
  loop do
    puts "running frame"
    emulator.frame
    sleep 0.5
  end
end

sockets = []

on_render = lambda do |scrn|
  next if scrn.first.nil?
  puts "sending screen"
  scrn_as_json = Yajl::Encoder.encode(scrn)
  sockets.each do |socket|
    socket.send(scrn_as_json)
  end
end
emulator.on_render(on_render)

App = lambda do |env|
  if Faye::WebSocket.websocket?(env)
    ws = Faye::WebSocket.new(env)
    sockets << ws

    ws.on :message do |event|
      ws.send(event.data)
    end

    ws.on :close do |event|
      p [:close, event.code, event.reason]
      sockets.delete(ws)
      ws = nil
    end

    # Return async Rack response
    ws.rack_response

  else
    # Normal HTTP request
    [200, {'Content-Type' => 'text/html'}, [File.read('index.html')]]
  end
end


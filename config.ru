require 'rubygems'
require 'bundler/setup'
require File.expand_path('../app', __FILE__)

Faye::WebSocket.load_adapter('thin')
# Faye::WebSocket.load_adapter('rainbows')

run App

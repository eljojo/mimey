require 'mimey'

emulator = Mimey::Emulator.new
emulator.nop_mode = true
emulator.debug_mode = true
emulator.load_rom("./test_roms/opus5.gb")
emulator.run

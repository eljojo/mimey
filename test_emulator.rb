require 'mimey'

emulator = Mimey::Emulator.new
emulator.debug_mode = true
emulator.step_by_step = true
emulator.load_rom("./test_roms/opus5.gb")
# emulator.reset

# emulator.debug
emulator.run_test 60.times
# emulator.debug

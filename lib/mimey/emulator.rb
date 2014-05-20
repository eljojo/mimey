require 'mimey/cpu/operations'

module Mimey
  class Emulator
    attr_accessor :debug_mode

    def initialize(cpu_options = {})
      cpu_options = CPU::DEFAULTS.merge(cpu_options)
      @cpu = CPU.new(cpu_options)
    end

    def nop_mode=(nop_mode)
      @cpu.nop_mode = nop_mode
    end

    def load_rom(path)
      rom = File.binread(path)
      @cpu.load_with(*rom.unpack("C*"))
    end

    def run
      loop do
        @cpu.step
        @cpu.debug if !!debug_mode
      end
    end
  end
end

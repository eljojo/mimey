require 'mimey/cpu/operations'

module Mimey
  class Emulator
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
      loop { @cpu.step }
    end
  end
end

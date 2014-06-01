require 'spec_helper'

describe Mimey::CPU do
  subject(:cpu) { Mimey::CPU.new(options) }
  let(:options) { Mimey::CPU::DEFAULTS }

  describe "JR n" do
    let(:options) {{ pc: 0x02 }}

    context "when n is positive" do
      before { cpu.load_with(0x00, 0x00, 0x18, 0b0000_0010).step }

      its(:clock_m) { should == 3 }

      it "jumps forward" do
        cpu.pc.should == 0x05
      end
    end

    context "when n is negative" do
      before { cpu.load_with(0x00, 0x00, 0x18, 0b1111_1101).step }

      its(:clock_m) { should == 3 }

      it "jumps back" do
        cpu.pc.should == 0x00
      end
    end
  end

  describe "JR cc,n" do
    it "should be 4" do
      opcodes = [0x20, 0x28, 0x30, 0x38]

      [:jr_nz_n, :jr_z_n, :jr_nc_n, :jr_c_n].each_with_index do |m, i|
        cpu.should respond_to m
        opcode = opcodes[i]
        CPU::OPERATIONS[opcode].should == m
      end
    end

    it "should add n to current address and jump to it if the flag is set and cc is set" do
      cpu = CPU.new(pc:0x02, f:CPU::Z_FLAG)

      cpu.load_with(0x00, 0x00, 0x28, 0b0000_0010).step

      cpu.pc.should == 0x05
      cpu.z_flag.should be_true
      cpu.clock_m.should == 3
    end

    it "should add n to current address and jump to it if the flag is unset and cc is unset" do
      cpu = CPU.new(pc:0x02)

      cpu.load_with(0x00, 0x00, 0x20, 0b0000_0010).step

      cpu.pc.should == 0x05
      cpu.z_flag.should be_false
      cpu.clock_m.should == 3
    end

    it "should continue if the flag is set and cc is unset" do
      cpu = CPU.new(pc:0x02)

      cpu.load_with(0x00, 0x00, 0x28, 0b0000_0010).step

      cpu.pc.should == 0x04
      cpu.clock_m.should == 2
    end

    it "should continue if the flag is unset and cc is set" do
      cpu = CPU.new(pc:0x02, f:CPU::Z_FLAG)

      cpu.load_with(0x00, 0x00, 0x20, 0b0000_0010).step

      cpu.pc.should == 0x04
      cpu.z_flag.should be_true
      cpu.clock_m.should == 2
    end

    it "should jump back if n is negative and the flag is set and cc is set" do
      cpu = CPU.new(pc:0x02, f:CPU::Z_FLAG)

      cpu.load_with(0x00, 0x00, 0x28, 0b1111_1101).step

      cpu.pc.should == 0x00
      cpu.z_flag.should be_true
      cpu.clock_m.should == 3
    end

    it "should jump back if n is negative and the flag is unset and cc is unset" do
      cpu = CPU.new(pc:0x02)

      cpu.load_with(0x00, 0x00, 0x20, 0b1111_1101).step

      cpu.pc.should == 0x00
      cpu.clock_m.should == 3
    end
  end
end

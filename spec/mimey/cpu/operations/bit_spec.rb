require 'spec_helper'

describe Mimey::CPU do
  subject(:cpu) { Mimey::CPU.new(options) }
  let(:options) { Mimey::CPU::DEFAULTS }

  describe "RLCA" do
    before { cpu.load_with(0x07).step }

    let(:options) {{ a: 0x01 }}

    its(:clock_m) { should == 1 }
    its(:pc) { should == 0x0001 }
    specify { cpu.should have_only_flags }

    it "rotates the bits of the A register to the left" do
      cpu.a.should == 0x02
    end

    context "when there is carry" do
      let(:options) {{ a: 0xFE }}

      its(:a) { should == 0xFD }
      specify { cpu.should have_only_flags :c }
    end
  end

  describe "RRCA" do
    before { cpu.load_with(0x0F).step }

    let(:options) {{ a: 0x02 }}

    its(:clock_m) { should == 1 }
    its(:pc) { should == 0x0001 }
    specify { cpu.should have_only_flags }

    it "rotates the bits of the A register to the right" do
      cpu.a.should == 0x01
    end

    context "when there is carry" do
      let(:options) {{ a: 0x7F }}

      its(:a) { should == 0xBF }
      specify { cpu.should have_only_flags :c }
    end
  end
end

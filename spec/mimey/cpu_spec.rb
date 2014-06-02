require 'spec_helper'

describe Mimey::CPU do
  subject(:cpu) { Mimey::CPU.new(options) }
  let(:options) { Mimey::CPU::DEFAULTS }

  [:a, :f, :b, :c, :d, :e, :h, :l, :pc, :sp].each do |r|
    its(r) { should == 0 }
  end

  context 'when options are provided' do
    let(:options) {{
      a: 0x0A,
      f: 0x0F,
      b: 0x0B,
      c: 0x0C,
      d: 0x0D,
      e: 0x0E,
      h: 0x11,
      l: 0x15,
      pc: 0xCAFE,
      sp: 0xFEA0
    }}

    [:a, :f, :b, :c, :d, :e, :h, :l, :pc, :sp].each do |r|
      its(r) { should == options[r] }
    end

    its(:af) { should == 0x0A0F }
    its(:bc) { should == 0x0B0C }
    its(:de) { should == 0x0D0E }
    its(:hl) { should == 0x1115 }
  end

  describe '#af=' do
    before { cpu.af = 0xABCD }

    its(:a) { should == 0xAB }
    its(:f) { should == 0xCD }
  end

  describe '#bc=' do
    before { cpu.bc = 0xABCD }

    its(:b) { should == 0xAB }
    its(:c) { should == 0xCD }
  end

  describe '#de=' do
    before { cpu.de = 0xABCD }

    its(:d) { should == 0xAB }
    its(:e) { should == 0xCD }
  end

  describe '#hl=' do
    before { cpu.hl = 0xABCD }

    its(:h) { should == 0xAB }
    its(:l) { should == 0xCD }
  end

  describe '#z_flag' do
    context 'when the flag is off' do
      let(:options) {{ f: 0b0111_0000 }}

      its(:z_flag) { should be_false }
    end

    context 'when the flag is on' do
      let(:options) {{ f: 0b1000_0000 }}

      its(:z_flag) { should be_true }
    end
  end

  describe '#n_flag' do
    context 'when the flag is off' do
      let(:options) {{ f: 0b1011_0000 }}

      its(:n_flag) { should be_false }
    end

    context 'when the flag is on' do
      let(:options) {{ f: 0b0100_0000 }}

      its(:n_flag) { should be_true }
    end
  end

  describe '#h_flag' do
    context 'when the flag is off' do
      let(:options) {{ f: 0b1101_0000 }}

      its(:h_flag) { should be_false }
    end

    context 'when the flag is on' do
      let(:options) {{ f: 0b0010_0000 }}

      its(:h_flag) { should be_true }
    end
  end

  describe '#c_flag' do
    context 'when the flag is off' do
      let(:options) {{ f: 0b1110_0000 }}

      its(:c_flag) { should be_false }
    end

    context 'when the flag is on' do
      let(:options) {{ f: 0b0001_0000 }}

      its(:c_flag) { should be_true }
    end
  end

  context 'when a program is loaded' do
    before { cpu.load_with(0xAB, 0xCD) }

    describe '#next_byte' do
      let!(:result) { cpu.next_byte }

      specify { result.should == 0xAB }
      its(:pc) { should == 1 }
    end

    describe '#next_word' do
      let!(:result) { cpu.next_word }

      specify { result.should == 0xCDAB }
      its(:pc) { should == 2 }
    end
  end
end

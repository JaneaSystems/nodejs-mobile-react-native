require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name                  = 'RNNodeJsMobile'
  s.version               = package['version'].sub('-beta', '')
  s.license               = { :type => 'MIT' }
  s.homepage              = package['homepage']
  s.authors               = package['author']
  s.summary               = package['description']
  s.source                = { :git => 'https://github.com/jgtoriginal/RNNodeJsMobile.git', :tag => 'master' }
  s.source_files          = [
				'ios/*.{h,m,mm,hpp,cpp}', 
				'ios/NodeMobile.framework/Headers/*.{h}', 
				'ios/libnode/include/node/*.{h}', 
				'ios/libnode/include/node/**/*.{h}', 
				'ios/libRNNodeJsMobile.a'
			    ]
  s.platform              = :ios, '8.0'
  s.static_framework      = true
  s.cocoapods_version     = ">= 1.2.0"
  s.dependency            'AFNetworking', '~> 3.2.1'
  s.dependency            'React'
end

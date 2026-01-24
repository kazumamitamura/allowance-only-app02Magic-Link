// utils/allowanceRules.ts
// 手当計算ロジック（規約完全準拠版）

export const ACTIVITY_TYPES = [
    { id: 'A', label: 'A:休日部活(1日)', requiresHoliday: true },
    { id: 'B', label: 'B:休日部活(半日)', requiresHoliday: true },
    { id: 'C', label: 'C:指定大会（対外運動競技等引率）', requiresHoliday: false },
    { id: 'D', label: 'D:指定外大会', requiresHoliday: false },
    { id: 'E', label: 'E:遠征（部活動指導）', requiresHoliday: false },
    { id: 'F', label: 'F:校内合宿（宿泊を伴う指導）', requiresHoliday: false },
    { id: 'G', label: 'G:研修旅行等引率', requiresHoliday: false },
    { id: 'DISASTER', label: '災害業務', requiresHoliday: false },
    { id: 'CUSTOM', label: 'その他（手入力）', requiresHoliday: false },
  ]
  
export const DESTINATIONS = [
    { id: 'school', label: '校内' },
    { id: 'inside_short', label: '管内（庄内・新庄最上）' },
    { id: 'inside_long', label: '県内（片道120km以上）' },
    { id: 'outside', label: '県外' },
]

/**
 * マスタ参照型の手当金額計算（新版）
 * @param activityId 活動種別
 * @param isDriving 運転の有無
 * @param destinationId 行き先区分
 * @param isWorkDay 勤務日かどうか
 * @param isAccommodation 宿泊の有無
 * @param isHalfDay 半日かどうか（指定大会用）
 * @param allowanceTypes マスタデータ（allowance_types）
 * @returns 手当金額
 */
export const calculateAmountFromMaster = (
    activityId: string,
    isDriving: boolean,
    destinationId: string,
    isWorkDay: boolean,
    isAccommodation: boolean = false,
    isHalfDay: boolean = false,
    allowanceTypes: { code: string, base_amount: number }[] = []
): number => {
    // マスタから基本金額を取得
    const getMasterAmount = (code: string): number => {
        return allowanceTypes.find(t => t.code === code)?.base_amount || 0
    }

    // 災害業務（新規）
    if (activityId === 'DISASTER') {
        const disasterAmount = getMasterAmount('Disaster')
        return disasterAmount > 0 ? disasterAmount : 6000 // フォールバック: 6,000円
    }

    // 運転ありの場合の特別ルール（最優先）
    if (isDriving) {
        const baseAmount = activityId === 'C' ? getMasterAmount('C') : getMasterAmount(activityId)
        
        // 県外への運転: 15,000円（活動タイプに関係なく）
        if (destinationId === 'outside') {
            // 遠征（E）の場合は運転手当のみ、休日手当を含まない
            // 平日の場合は2,400円を引く
            if (activityId === 'E') {
                return isWorkDay ? 15000 - 2400 : 15000
            }
            // 合宿（F）で宿泊ありの場合のみ加算
            return isAccommodation && activityId === 'F' 
                ? 15000 + (baseAmount > 0 ? baseAmount : 2400) 
                : 15000
        }
        
        // 県内120km以上への運転: 7,500円（活動タイプに関係なく）
        if (destinationId === 'inside_long') {
            // 遠征（E）の場合は運転手当のみ、休日手当を含まない
            // 平日の場合は2,400円を引く
            if (activityId === 'E') {
                return isWorkDay ? 7500 - 2400 : 7500
            }
            // 合宿（F）で宿泊ありの場合のみ加算
            return isAccommodation && activityId === 'F' 
                ? 7500 + (baseAmount > 0 ? baseAmount : 2400) 
                : 7500
        }
        
        // 管内または校内への運転
        if (destinationId === 'inside_short' || destinationId === 'school') {
            // C. 指定大会の場合: 基本金額のみ
            if (activityId === 'C') {
                return baseAmount > 0 ? baseAmount : 3400
            }
            
            // E. 遠征の場合: 平日は運転手当から2,400円を引く、休日は2,400円のみ
            if (activityId === 'E') {
                if (isWorkDay) {
                    // 平日: 管内運転5,100円 - 2,400円 = 2,700円
                    return 2700
                } else {
                    // 休日: 2,400円のみ（運転手当を含む）
                    return 2400
                }
            }
            
            // F. 合宿の場合: 勤務日は5100円（校内合宿なので運転なし）
            if (activityId === 'F') {
                if (isWorkDay) {
                    const insideDrivingAmount = 5100
                    return isAccommodation 
                        ? insideDrivingAmount + (baseAmount > 0 ? baseAmount : 2400) 
                        : insideDrivingAmount
                } else {
                    return baseAmount > 0 ? baseAmount : 2400
                }
            }
        }
    }
    
    // E/F 特例（運転なしの場合）: 平日・休日に関わらず常にマスタ設定金額（2,400円）を適用
    if (activityId === 'E' || activityId === 'F') {
        const baseAmount = getMasterAmount(activityId)
        return baseAmount > 0 ? baseAmount : 2400
    }

    // その他の活動種別（既存ロジック）
    if (activityId === 'A') {
        if (isWorkDay) return 0
        const aAmount = getMasterAmount('A')
        return aAmount > 0 ? aAmount : 2400 // フォールバック
    }

    if (activityId === 'B') {
        if (isWorkDay) return 0
        const bAmount = getMasterAmount('B')
        return bAmount > 0 ? bAmount : 1700 // フォールバック
    }

    if (activityId === 'C') {
        if (isHalfDay) {
            const halfDayAmount = getMasterAmount('B')
            return halfDayAmount > 0 ? halfDayAmount : 1700 // フォールバック
        }
        const cAmount = getMasterAmount('C')
        if (cAmount > 0) return cAmount
        // マスタが0の場合、従来ロジックにフォールバック
        return 3400
    }

    if (activityId === 'D') {
        const dAmount = getMasterAmount('D')
        return dAmount > 0 ? dAmount : 2400 // フォールバック
    }

    if (activityId === 'G') {
        const gAmount = getMasterAmount('G')
        return gAmount > 0 ? gAmount : 3400 // フォールバック
    }

    return 0
}

/**
 * 手当金額計算（運転判定優先版）
 * @param activityId 活動種別
 * @param isDriving 運転の有無
 * @param destinationId 行き先区分
 * @param isWorkDay 勤務日かどうか
 * @param isAccommodation 宿泊の有無
 * @param isHalfDay 半日かどうか（指定大会用）
 * @returns 手当金額
 */
export const calculateAmount = (
    activityId: string,
    isDriving: boolean,
    destinationId: string,
    isWorkDay: boolean,
    isAccommodation: boolean = false,
    isHalfDay: boolean = false
): number => {
    // ===========================================
    // 【最優先】運転ありの場合の特別ルール
    // ===========================================
    if (isDriving) {
        // 県外への運転は一律 15,000円（活動タイプに関係なく）
        if (destinationId === 'outside') {
            // 遠征（E）の場合は運転手当のみ、平日は2,400円を引く
            if (activityId === 'E') {
                return isWorkDay ? 15000 - 2400 : 15000
            }
            // 合宿（F）で宿泊がある場合のみ加算
            if (isAccommodation && activityId === 'F') {
                return 15000 + 2400
            }
            return 15000
        }
        
        // 県内（120km以上）への運転は一律 7,500円
        if (destinationId === 'inside_long') {
            // 遠征（E）の場合は運転手当のみ、平日は2,400円を引く
            if (activityId === 'E') {
                return isWorkDay ? 7500 - 2400 : 7500
            }
            // 合宿（F）で宿泊がある場合のみ加算
            if (isAccommodation && activityId === 'F') {
                return 7500 + 2400
            }
            return 7500
        }
        
        // 管内または校内運転の場合は、活動タイプごとのルールに従う
        if (destinationId === 'inside_short' || destinationId === 'school') {
            // C. 指定大会の場合
            if (activityId === 'C') {
                return 3400
            }
            
            // E. 遠征の場合: 平日は運転手当から2,400円を引く
            if (activityId === 'E') {
                if (isWorkDay) {
                    // 平日: 5,100円 - 2,400円 = 2,700円
                    return 2700
                } else {
                    // 休日: 2,400円のみ（運転手当を含む）
                    return 2400
                }
            }
            
            // F. 合宿の場合
            if (activityId === 'F') {
                if (isWorkDay) {
                    // 勤務日の管内運転
                    if (isAccommodation) {
                        return 5100 + 2400
                    }
                    return 5100
                } else {
                    // 休日の管内運転
                    return 2400
                }
            }
            
            // その他の活動で管内運転の場合、基本額を適用
        }
    }
    
    // ===========================================
    // 運転なしの場合の処理
    // ===========================================
    
    // A. 休日部活（1日）
    if (activityId === 'A') {
        if (isWorkDay) return 0
        return 2400
    }

    // B. 休日部活（半日）
    if (activityId === 'B') {
        if (isWorkDay) return 0
        return 1700
    }

    // C. 指定大会（対外運動競技等引率）
    if (activityId === 'C') {
        if (isHalfDay) return 1700
        return 3400 // 運転なしの基本額
    }

    // D. 指定外大会
    if (activityId === 'D') {
        return 2400
    }

    // E. 遠征 / F. 合宿（運転なしの場合）
    if (activityId === 'E' || activityId === 'F') {
        if (isWorkDay) {
            // 勤務日は宿泊のみ支給
            return isAccommodation ? 2400 : 0
        } else {
            // 休日は基本額
            return 2400
        }
    }

    // G. 研修旅行等引率
    if (activityId === 'G') {
        return 3400
    }

    // その他
    if (activityId === 'OTHER') {
        return 6000
    }

    return 0
}

/**
 * 勤務日判定用のヘルパー関数
 */
export const canSelectActivity = (
    activityId: string, 
    isWorkDay: boolean
): { allowed: boolean, message?: string } => {
    const activity = ACTIVITY_TYPES.find(a => a.id === activityId)
    if (!activity) return { allowed: true }
    
    if (activity.requiresHoliday && isWorkDay) {
        return { 
            allowed: false, 
            message: `${activity.label}は休日のみ選択可能です。勤務日には選択できません。` 
        }
    }
    
    return { allowed: true }
}

/**
 * 活動種別の説明文を取得
 */
export const getActivityDescription = (activityId: string): string => {
    const descriptions: Record<string, string> = {
        'A': '土日の部活動指導（1日）- 2,400円',
        'B': '土日の部活動指導（半日）- 1,700円',
        'C': '対外運動競技等の引率 - 基本3,400円（運転・距離により変動）',
        'D': '指定外大会 - 2,400円',
        'E': '遠征での部活動指導 - 休日/勤務日・運転により変動',
        'F': '校内合宿（宿泊を伴う指導） - 休日/勤務日・宿泊により変動',
        'G': '研修旅行等の引率 - 3,400円',
        'OTHER': 'その他の業務 - 6,000円'
    }
    return descriptions[activityId] || ''
}

/**
 * 運転手当の適用条件を判定
 * F（校内合宿）は運転なしなので除外
 */
export const needsDrivingSelection = (activityId: string): boolean => {
    return ['C', 'E'].includes(activityId)
}

/**
 * 宿泊手当の適用条件を判定
 * Hは削除されたので除外
 */
export const needsAccommodationSelection = (activityId: string): boolean => {
    return ['E', 'F'].includes(activityId)
}
